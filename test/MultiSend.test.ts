import { expect } from "chai";
import { ethers } from "hardhat";
import { MultiSend, MockToken, MockToken__factory, MultiSend__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MultiSend Contract", function () {
    let multiSend: MultiSend;
    let mockToken: MockToken;
    let owner: HardhatEthersSigner;
    let addr1: HardhatEthersSigner, addr2: HardhatEthersSigner, addr3: HardhatEthersSigner, 
        addr4: HardhatEthersSigner, addr5: HardhatEthersSigner;
    let recipients500: string[]; // Array of 500 test addresses
    
    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
    const SEND_AMOUNT = ethers.parseEther("100"); // 100 tokens per recipient
    
    beforeEach(async function () {
        // Get signers
        const signers = await ethers.getSigners();
        [owner, addr1, addr2, addr3, addr4, addr5] = signers;
        
        // Deploy MockToken
        const MockTokenFactory = await ethers.getContractFactory("MockToken");
        const deployedMockToken = await MockTokenFactory.deploy("Test Token", "TEST", 1000000);
        await deployedMockToken.waitForDeployment();
        mockToken = deployedMockToken as unknown as MockToken;
        
        // Deploy MultiSend
        const MultiSendFactory = await ethers.getContractFactory("MultiSend");
        const deployedMultiSend = await MultiSendFactory.deploy();
        await deployedMultiSend.waitForDeployment();
        multiSend = deployedMultiSend as unknown as MultiSend;
        
        // Prepare 500 recipients (use available signers and create additional addresses)
        const availableSigners = signers.slice(6, Math.min(506, signers.length));
        const additionalAddresses: string[] = [];
        
        // Create additional addresses if needed
        for (let i = availableSigners.length; i < 500; i++) {
            const wallet = ethers.Wallet.createRandom();
            additionalAddresses.push(wallet.address);
        }
        
        recipients500 = [
            ...availableSigners.map(signer => signer.address),
            ...additionalAddresses
        ].slice(0, 500);
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await multiSend.owner()).to.equal(owner.address);
        });
        
        it("Should set correct initial values", async function () {
            expect(await multiSend.batchCounter()).to.equal(0);
            expect(await multiSend.maxRecipientsPerBatch()).to.equal(500);
        });
    });
    
    describe("Token Multi-Send", function () {
        beforeEach(async function () {
            // Approve MultiSend contract to spend tokens
            await mockToken.approve(await multiSend.getAddress(), INITIAL_SUPPLY);
        });
        
        it("Should send tokens to multiple recipients with different amounts", async function () {
            const recipients = [
                { wallet: addr1.address, amount: ethers.parseEther("10") },
                { wallet: addr2.address, amount: ethers.parseEther("20") },
                { wallet: addr3.address, amount: ethers.parseEther("30") }
            ];
            
            const totalAmount = ethers.parseEther("60");
            
            await expect(
                multiSend.multiSendToken(await mockToken.getAddress(), recipients)
            ).to.emit(multiSend, "BatchSent")
             .withArgs(await mockToken.getAddress(), totalAmount, 3, 1);
            
            // Check balances
            expect(await mockToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
            expect(await mockToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("20"));
            expect(await mockToken.balanceOf(addr3.address)).to.equal(ethers.parseEther("30"));
        });
        
        it("Should send same amount to multiple recipients", async function () {
            const recipients = [addr1.address, addr2.address, addr3.address];
            const amount = ethers.parseEther("50");
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.emit(multiSend, "BatchSent")
             .withArgs(await mockToken.getAddress(), amount * BigInt(3), 3, 1);
            
            // Check balances
            for (const recipient of recipients) {
                expect(await mockToken.balanceOf(recipient)).to.equal(amount);
            }
        });
        
        it("Should handle maximum 500 recipients", async function () {
            const amount = ethers.parseEther("1"); // 1 token per recipient
            const totalAmount = amount * BigInt(500);
            
            // Mint enough tokens for the test
            await mockToken.mint(owner.address, totalAmount);
            await mockToken.approve(await multiSend.getAddress(), totalAmount);
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients500, amount)
            ).to.emit(multiSend, "BatchSent")
             .withArgs(await mockToken.getAddress(), totalAmount, 500, 1);
            
            // Check first and last recipient balances
            expect(await mockToken.balanceOf(recipients500[0])).to.equal(amount);
            expect(await mockToken.balanceOf(recipients500[499])).to.equal(amount);
        });
        
        it("Should revert if exceeding max recipients", async function () {
            const recipients = new Array(501).fill(addr1.address);
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "TooManyRecipients");
        });
        
        it("Should revert with insufficient token balance", async function () {
            const recipients = [addr1.address, addr2.address];
            const amount = ethers.parseEther("600000"); // More than available
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "InsufficientTokenBalance");
        });
        
        it("Should revert with insufficient allowance", async function () {
            // Reset allowance to 0
            await mockToken.approve(await multiSend.getAddress(), 0);
            
            const recipients = [addr1.address];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "InsufficientAllowance");
        });

        it("Should revert with invalid token address", async function () {
            const recipients = [addr1.address];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendTokenSameAmount(ethers.ZeroAddress, recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "InvalidTokenAddress");
        });

        it("Should revert with no recipients provided", async function () {
            const recipients: string[] = [];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "NoRecipientsProvided");
        });

        it("Should revert with invalid amount", async function () {
            const recipients = [addr1.address];
            const amount = 0;
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "InvalidAmount");
        });

        it("Should revert with invalid recipient address", async function () {
            const recipients = [ethers.ZeroAddress];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendTokenSameAmount(await mockToken.getAddress(), recipients, amount)
            ).to.be.revertedWithCustomError(multiSend, "InvalidRecipientAddress");
        });
    });
    
    describe("BNB Multi-Send", function () {
        it("Should send BNB to multiple recipients with different amounts", async function () {
            const recipients = [
                { wallet: addr1.address, amount: ethers.parseEther("1") },
                { wallet: addr2.address, amount: ethers.parseEther("2") },
                { wallet: addr3.address, amount: ethers.parseEther("3") }
            ];
            
            const totalAmount = ethers.parseEther("6");
            const initialBalance1 = await ethers.provider.getBalance(addr1.address);
            const initialBalance2 = await ethers.provider.getBalance(addr2.address);
            const initialBalance3 = await ethers.provider.getBalance(addr3.address);
            
            await expect(
                multiSend.multiSendBNB(recipients, { value: totalAmount })
            ).to.emit(multiSend, "BatchSent")
             .withArgs(ethers.ZeroAddress, totalAmount, 3, 1);
            
            // Check balances
            expect(await ethers.provider.getBalance(addr1.address))
                .to.equal(initialBalance1 + ethers.parseEther("1"));
            expect(await ethers.provider.getBalance(addr2.address))
                .to.equal(initialBalance2 + ethers.parseEther("2"));
            expect(await ethers.provider.getBalance(addr3.address))
                .to.equal(initialBalance3 + ethers.parseEther("3"));
        });
        
        it("Should send same BNB amount to multiple recipients", async function () {
            const recipients = [addr1.address, addr2.address, addr3.address];
            const amount = ethers.parseEther("1");
            const totalAmount = amount * BigInt(3);
            
            const initialBalances = await Promise.all(
                recipients.map(addr => ethers.provider.getBalance(addr))
            );
            
            await expect(
                multiSend.multiSendBNBSameAmount(recipients, amount, { value: totalAmount })
            ).to.emit(multiSend, "BatchSent")
             .withArgs(ethers.ZeroAddress, totalAmount, 3, 1);
            
            // Check balances
            for (let i = 0; i < recipients.length; i++) {
                expect(await ethers.provider.getBalance(recipients[i]))
                    .to.equal(initialBalances[i] + amount);
            }
        });
        
        it("Should refund excess BNB", async function () {
            const recipients = [addr1.address];
            const amount = ethers.parseEther("1");
            const sentAmount = ethers.parseEther("2"); // Send more than needed
            
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await multiSend.multiSendBNBSameAmount(recipients, amount, { value: sentAmount });
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
            
            // Owner should get refund minus gas
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            const expectedBalance = initialOwnerBalance - amount - gasUsed;
            
            expect(finalOwnerBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
        });
        
        it("Should revert with insufficient BNB", async function () {
            const recipients = [addr1.address, addr2.address];
            const amount = ethers.parseEther("1");
            const totalNeeded = amount * BigInt(2);
            const sentAmount = ethers.parseEther("1"); // Less than needed
            
            await expect(
                multiSend.multiSendBNBSameAmount(recipients, amount, { value: sentAmount })
            ).to.be.revertedWithCustomError(multiSend, "InsufficientBNBSent");
        });

        it("Should revert with no recipients provided for BNB", async function () {
            const recipients: string[] = [];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendBNBSameAmount(recipients, amount, { value: amount })
            ).to.be.revertedWithCustomError(multiSend, "NoRecipientsProvided");
        });

        it("Should revert with invalid amount for BNB", async function () {
            const recipients = [addr1.address];
            const amount = 0;
            
            await expect(
                multiSend.multiSendBNBSameAmount(recipients, amount, { value: ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(multiSend, "InvalidAmount");
        });

        it("Should revert with invalid recipient address for BNB", async function () {
            const recipients = [ethers.ZeroAddress];
            const amount = ethers.parseEther("1");
            
            await expect(
                multiSend.multiSendBNBSameAmount(recipients, amount, { value: amount })
            ).to.be.revertedWithCustomError(multiSend, "InvalidRecipientAddress");
        });
    });
    
    describe("Admin Functions", function () {
        it("Should allow owner to set max recipients", async function () {
            await multiSend.setMaxRecipientsPerBatch(1000);
            expect(await multiSend.maxRecipientsPerBatch()).to.equal(1000);
        });
        
        it("Should revert if non-owner tries to set max recipients", async function () {
            await expect(
                multiSend.connect(addr1).setMaxRecipientsPerBatch(1000)
            ).to.be.revertedWithCustomError(multiSend, "OwnableUnauthorizedAccount");
        });
        
        it("Should revert if setting max recipients to 0", async function () {
            await expect(
                multiSend.setMaxRecipientsPerBatch(0)
            ).to.be.revertedWithCustomError(multiSend, "InvalidMaxRecipients");
        });

        it("Should revert if setting max recipients above 1000", async function () {
            await expect(
                multiSend.setMaxRecipientsPerBatch(1001)
            ).to.be.revertedWithCustomError(multiSend, "InvalidMaxRecipients");
        });
    });
    
    describe("Emergency Withdrawal", function () {
        it("Should allow owner to withdraw BNB", async function () {
            // Send some BNB to contract
            await owner.sendTransaction({
                to: await multiSend.getAddress(),
                value: ethers.parseEther("5")
            });
            
            const initialBalance = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(await multiSend.getAddress());
            
            const tx = await multiSend.emergencyWithdraw(ethers.ZeroAddress);
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            const expectedBalance = initialBalance + contractBalance - gasUsed;
            
            expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
        });
        
        it("Should allow owner to withdraw tokens", async function () {
            // Send some tokens to contract
            await mockToken.transfer(await multiSend.getAddress(), ethers.parseEther("100"));
            
            const initialBalance = await mockToken.balanceOf(owner.address);
            const contractBalance = await mockToken.balanceOf(await multiSend.getAddress());
            
            await multiSend.emergencyWithdraw(await mockToken.getAddress());
            
            const finalBalance = await mockToken.balanceOf(owner.address);
            expect(finalBalance).to.equal(initialBalance + contractBalance);
        });
        
        it("Should revert if non-owner tries emergency withdrawal", async function () {
            await expect(
                multiSend.connect(addr1).emergencyWithdraw(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(multiSend, "OwnableUnauthorizedAccount");
            
            await expect(
                multiSend.connect(addr1).emergencyWithdraw(await mockToken.getAddress())
            ).to.be.revertedWithCustomError(multiSend, "OwnableUnauthorizedAccount");
        });

        it("Should revert if no BNB to withdraw", async function () {
            await expect(
                multiSend.emergencyWithdraw(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(multiSend, "NoBNBToWithdraw");
        });

        it("Should revert if no tokens to withdraw", async function () {
            await expect(
                multiSend.emergencyWithdraw(await mockToken.getAddress())
            ).to.be.revertedWithCustomError(multiSend, "NoTokensToWithdraw");
        });
    });
    
    describe("View Functions", function () {
        it("Should return correct contract info", async function () {
            const contractInfo = await multiSend.getContractInfo();
            expect(contractInfo.currentBatchCounter).to.equal(0);
            expect(contractInfo.maxRecipients).to.equal(500);
            expect(contractInfo.contractOwner).to.equal(owner.address);
        });

        it("Should check batch processed status", async function () {
            const batchId = 1;
            const isProcessed = await multiSend.isBatchProcessed(batchId);
            expect(isProcessed).to.equal(false);
        });
    });
    
    describe("Gas Optimization", function () {
        it("Should use reasonable gas for 500 recipients", async function () {
            const amount = ethers.parseEther("1");
            const totalAmount = amount * BigInt(500);
            
            // Mint enough tokens
            await mockToken.mint(owner.address, totalAmount);
            await mockToken.approve(await multiSend.getAddress(), totalAmount);
            
            const tx = await multiSend.multiSendTokenSameAmount(
                await mockToken.getAddress(), 
                recipients500, 
                amount
            );
            const receipt = await tx.wait();
            
            // Gas should be less than 16M for 500 recipients
            expect(receipt!.gasUsed).to.be.lessThan(16000000);
            console.log(`Gas used for 500 recipients: ${receipt!.gasUsed}`);
        });
    });
});