// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiSend
 * @dev Contract for sending ERC20 tokens to multiple addresses simultaneously
 * Optimized for BSC with capability to handle 500 users per batch
 */
contract MultiSend is Ownable, ReentrancyGuard {
    
    // Custom errors for gas optimization
    error InvalidTokenAddress();
    error NoRecipientsProvided();
    error TooManyRecipients();
    error InvalidRecipientAddress();
    error InvalidAmount();
    error InsufficientTokenBalance();
    error InsufficientAllowance();
    error TransferFailed();
    error InsufficientBNBSent();
    error BNBTransferFailed();
    error RefundFailed();
    error InvalidMaxRecipients();
    error NoBNBToWithdraw();
    error BNBWithdrawalFailed();
    error NoTokensToWithdraw();
    error TokenWithdrawalFailed();
    
    // Events
    event BatchSent(
        address indexed token,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 batchId
    );
    
    event SingleTransfer(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        uint256 batchId
    );
    
    // Struct to store recipient information and amount
    struct Recipient {
        address wallet;
        uint256 amount;
    }
    
    // Mapping to track batch IDs
    mapping(uint256 => bool) public processedBatches;
    
    // Counter for batch ID
    uint256 public batchCounter;
    
    // Maximum recipients per batch (adjustable)
    uint256 public maxRecipientsPerBatch = 500;
    
    constructor() Ownable(msg.sender) {
        batchCounter = 0;
    }
    
    // Receive function to allow contract to receive BNB
    receive() external payable {}
    
    /**
     * @dev Send ERC20 tokens to multiple addresses with different amounts
     * @param token Address of the ERC20 token contract
     * @param recipients Array of recipients with wallet and amount
     */
    function multiSendToken(
        address token,
        Recipient[] calldata recipients
    ) external nonReentrant {
        if (token == address(0)) revert InvalidTokenAddress();
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length > maxRecipientsPerBatch) revert TooManyRecipients();
        
        IERC20 tokenContract = IERC20(token);
        uint256 totalAmount = 0;
        uint256 currentBatchId = ++batchCounter;
        
        // Calculate total amount needed
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].wallet == address(0)) revert InvalidRecipientAddress();
            if (recipients[i].amount == 0) revert InvalidAmount();
            totalAmount += recipients[i].amount;
        }
        
        // Check balance and allowance
        if (tokenContract.balanceOf(msg.sender) < totalAmount) revert InsufficientTokenBalance();
        if (tokenContract.allowance(msg.sender, address(this)) < totalAmount) revert InsufficientAllowance();
        
        // Execute transfer for each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            bool success = tokenContract.transferFrom(
                msg.sender,
                recipients[i].wallet,
                recipients[i].amount
            );
            if (!success) revert TransferFailed();
            
            emit SingleTransfer(
                token,
                recipients[i].wallet,
                recipients[i].amount,
                currentBatchId
            );
        }
        
        // Mark batch as processed
        processedBatches[currentBatchId] = true;
        
        emit BatchSent(token, totalAmount, recipients.length, currentBatchId);
    }
    
    /**
     * @dev Send BNB to multiple addresses in one transaction
     * @param recipients Array of recipients with wallet and amount
     */
    function multiSendBNB(
        Recipient[] calldata recipients
    ) external payable nonReentrant {
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length > maxRecipientsPerBatch) revert TooManyRecipients();
        
        uint256 totalAmount = 0;
        uint256 currentBatchId = ++batchCounter;
        
        // Calculate total amount needed
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].wallet == address(0)) revert InvalidRecipientAddress();
            if (recipients[i].amount == 0) revert InvalidAmount();
            totalAmount += recipients[i].amount;
        }
        
        if (msg.value < totalAmount) revert InsufficientBNBSent();
        
        // Execute transfer for each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = payable(recipients[i].wallet).call{
                value: recipients[i].amount
            }("");
            if (!success) revert BNBTransferFailed();
            
            emit SingleTransfer(
                address(0), // address(0) represents BNB
                recipients[i].wallet,
                recipients[i].amount,
                currentBatchId
            );
        }
        
        // Refund excess BNB
        if (msg.value > totalAmount) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - totalAmount
            }("");
            if (!refundSuccess) revert RefundFailed();
        }
        
        // Mark batch as processed
        processedBatches[currentBatchId] = true;
        
        emit BatchSent(address(0), totalAmount, recipients.length, currentBatchId);
    }
    
    /**
     * @dev Send same amount of tokens to multiple addresses (more gas efficient)
     * @param token Address of the ERC20 token contract
     * @param recipients Array of recipient addresses
     * @param amount Token amount for each recipient
     */
    function multiSendTokenSameAmount(
        address token,
        address[] calldata recipients,
        uint256 amount
    ) external nonReentrant {
        if (token == address(0)) revert InvalidTokenAddress();
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length > maxRecipientsPerBatch) revert TooManyRecipients();
        if (amount == 0) revert InvalidAmount();
        
        IERC20 tokenContract = IERC20(token);
        uint256 totalAmount = amount * recipients.length;
        uint256 currentBatchId = ++batchCounter;
        
        // Check balance and allowance
        if (tokenContract.balanceOf(msg.sender) < totalAmount) revert InsufficientTokenBalance();
        if (tokenContract.allowance(msg.sender, address(this)) < totalAmount) revert InsufficientAllowance();
        
        // Execute transfer for each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert InvalidRecipientAddress();
            
            bool success = tokenContract.transferFrom(
                msg.sender,
                recipients[i],
                amount
            );
            if (!success) revert TransferFailed();
            
            emit SingleTransfer(
                token,
                recipients[i],
                amount,
                currentBatchId
            );
        }
        
        // Mark batch as processed
        processedBatches[currentBatchId] = true;
        
        emit BatchSent(token, totalAmount, recipients.length, currentBatchId);
    }
    
    /**
     * @dev Send same amount of BNB to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amount BNB amount for each recipient
     */
    function multiSendBNBSameAmount(
        address[] calldata recipients,
        uint256 amount
    ) external payable nonReentrant {
        if (recipients.length == 0) revert NoRecipientsProvided();
        if (recipients.length > maxRecipientsPerBatch) revert TooManyRecipients();
        if (amount == 0) revert InvalidAmount();
        
        uint256 totalAmount = amount * recipients.length;
        uint256 currentBatchId = ++batchCounter;
        
        if (msg.value < totalAmount) revert InsufficientBNBSent();
        
        // Execute transfer for each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert InvalidRecipientAddress();
            
            (bool success, ) = payable(recipients[i]).call{value: amount}("");
            if (!success) revert BNBTransferFailed();
            
            emit SingleTransfer(
                address(0),
                recipients[i],
                amount,
                currentBatchId
            );
        }
        
        // Refund excess BNB
        if (msg.value > totalAmount) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - totalAmount
            }("");
            if (!refundSuccess) revert RefundFailed();
        }
        
        // Mark batch as processed
        processedBatches[currentBatchId] = true;
        
        emit BatchSent(address(0), totalAmount, recipients.length, currentBatchId);
    }
    
    /**
     * @dev Update maximum recipients per batch (owner only)
     * @param newMax New maximum number of recipients
     */
    function setMaxRecipientsPerBatch(uint256 newMax) external onlyOwner {
        if (newMax == 0 || newMax > 1000) revert InvalidMaxRecipients();
        maxRecipientsPerBatch = newMax;
    }
    
    /**
     * @dev Emergency withdraw function (owner only)
     * @param token Token address to withdraw (address(0) for BNB)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            // Withdraw BNB
            uint256 balance = address(this).balance;
            if (balance == 0) revert NoBNBToWithdraw();
            (bool success, ) = payable(owner()).call{value: balance}("");
            if (!success) revert BNBWithdrawalFailed();
        } else {
            // Withdraw ERC20 token
            IERC20 tokenContract = IERC20(token);
            uint256 balance = tokenContract.balanceOf(address(this));
            if (balance == 0) revert NoTokensToWithdraw();
            if (!tokenContract.transfer(owner(), balance)) revert TokenWithdrawalFailed();
        }
    }
    
    /**
     * @dev Check if batch has been processed
     * @param batchId ID of the batch to check
     */
    function isBatchProcessed(uint256 batchId) external view returns (bool) {
        return processedBatches[batchId];
    }
    
    /**
     * @dev Get contract information
     */
    function getContractInfo() external view returns (
        uint256 currentBatchCounter,
        uint256 maxRecipients,
        address contractOwner
    ) {
        return (batchCounter, maxRecipientsPerBatch, owner());
    }
}