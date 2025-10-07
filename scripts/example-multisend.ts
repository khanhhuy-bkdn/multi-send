import { ethers } from "hardhat";
import { MultiSend } from "../typechain-types";

// Configuration
interface Config {
    MULTISEND_ADDRESS: string;
    TOKEN_ADDRESS: string;
    AMOUNT_PER_RECIPIENT: bigint;
    BATCH_SIZE: number;
    TOTAL_RECIPIENTS: number;
    GAS_PRICE_GWEI: number;
}

const CONFIG: Config = {
    // Contract address (update after deployment)
    MULTISEND_ADDRESS: "0x...", // Replace with deployed contract address
    
    // Token address (example: USDT on BSC)
    TOKEN_ADDRESS: "0x55d398326f99059fF775485246999027B3197955", // USDT BSC Mainnet
    
    // Amount per recipient (in token decimals)
    AMOUNT_PER_RECIPIENT: ethers.parseUnits("10", 18), // 10 tokens
    
    // Batch size
    BATCH_SIZE: 500,
    
    // Total recipients
    TOTAL_RECIPIENTS: 125312,
    
    // Gas price options (in gwei)
    GAS_PRICE_GWEI: 0.1 // Ultra low gas price
};

interface BatchResult {
    batchIndex: number;
    recipients: number;
    gasUsed: bigint;
    transactionHash: string;
    success: boolean;
    error?: string;
}

interface MultiSendResults {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    totalGasUsed: bigint;
    totalRecipients: number;
    executionTime: number;
    results: BatchResult[];
}

/**
 * Generate sample recipient addresses
 * In production, replace this with your actual recipient list
 */
function generateSampleRecipients(count: number): string[] {
    const recipients: string[] = [];
    for (let i = 0; i < count; i++) {
        // Generate random addresses for demo
        // In production, use your actual recipient addresses
        const wallet = ethers.Wallet.createRandom();
        recipients.push(wallet.address);
    }
    return recipients;
}

/**
 * Split recipients into batches
 */
function splitIntoBatches(recipients: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
    }
    return batches;
}

/**
 * Execute multi-send for a single batch
 */
async function executeBatch(
    multiSend: MultiSend, 
    tokenAddress: string, 
    recipients: string[], 
    amount: bigint, 
    batchIndex: number,
    gasPrice: bigint
): Promise<BatchResult> {
    console.log(`📦 Processing batch ${batchIndex + 1} with ${recipients.length} recipients...`);
    
    try {
        // Estimate gas
        const gasEstimate = await multiSend.multiSendTokenSameAmount.estimateGas(
            tokenAddress,
            recipients,
            amount
        );
        
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        console.log(`💰 Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
        
        // Execute transaction with custom gas price
        const tx = await multiSend.multiSendTokenSameAmount(
            tokenAddress,
            recipients,
            amount,
            {
                gasLimit: gasEstimate + BigInt(50000), // Add buffer
                gasPrice: gasPrice
            }
        );
        
        console.log(`🔗 Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Batch ${batchIndex + 1} completed! Gas used: ${receipt!.gasUsed.toString()}`);
        
        return {
            batchIndex,
            recipients: recipients.length,
            gasUsed: receipt!.gasUsed,
            transactionHash: tx.hash,
            success: true
        };
        
    } catch (error: any) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error.message);
        return {
            batchIndex,
            recipients: recipients.length,
            gasUsed: BigInt(0),
            transactionHash: "",
            success: false,
            error: error.message
        };
    }
}

/**
 * Execute multi-send for tokens
 */
async function executeMultiSend(): Promise<MultiSendResults> {
    console.log("🚀 Starting Multi-Send Token Distribution");
    console.log("==========================================");
    
    const startTime = Date.now();
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("📝 Sender address:", signer.address);
    
    // Connect to contracts
    const multiSend = await ethers.getContractAt("MultiSend", CONFIG.MULTISEND_ADDRESS) as MultiSend;
    const token = await ethers.getContractAt("IERC20", CONFIG.TOKEN_ADDRESS);
    
    // Check balances and allowances
    const balance = await token.balanceOf(signer.address);
    const allowance = await token.allowance(signer.address, CONFIG.MULTISEND_ADDRESS);
    const totalAmount = CONFIG.AMOUNT_PER_RECIPIENT * BigInt(CONFIG.TOTAL_RECIPIENTS);
    
    console.log(`💰 Token balance: ${ethers.formatUnits(balance, 18)}`);
    console.log(`🔓 Allowance: ${ethers.formatUnits(allowance, 18)}`);
    console.log(`📊 Total needed: ${ethers.formatUnits(totalAmount, 18)}`);
    
    if (balance < totalAmount) {
        throw new Error("Insufficient token balance");
    }
    
    if (allowance < totalAmount) {
        console.log("🔐 Approving tokens...");
        const approveTx = await token.approve(CONFIG.MULTISEND_ADDRESS, totalAmount);
        await approveTx.wait();
        console.log("✅ Tokens approved");
    }
    
    // Generate recipients and split into batches
    console.log(`👥 Generating ${CONFIG.TOTAL_RECIPIENTS} recipients...`);
    const recipients = generateSampleRecipients(CONFIG.TOTAL_RECIPIENTS);
    const batches = splitIntoBatches(recipients, CONFIG.BATCH_SIZE);
    
    console.log(`📦 Total batches: ${batches.length}`);
    console.log(`⛽ Using gas price: ${CONFIG.GAS_PRICE_GWEI} gwei`);
    
    // Convert gas price to wei
    const gasPrice = ethers.parseUnits(CONFIG.GAS_PRICE_GWEI.toString(), "gwei");
    
    // Execute batches
    const results: BatchResult[] = [];
    let totalGasUsed = BigInt(0);
    let successfulBatches = 0;
    
    for (let i = 0; i < batches.length; i++) {
        const result = await executeBatch(
            multiSend,
            CONFIG.TOKEN_ADDRESS,
            batches[i],
            CONFIG.AMOUNT_PER_RECIPIENT,
            i,
            gasPrice
        );
        
        results.push(result);
        
        if (result.success) {
            successfulBatches++;
            totalGasUsed += result.gasUsed;
        }
        
        // Add delay between batches to avoid nonce issues
        if (i < batches.length - 1) {
            console.log("⏳ Waiting 2 seconds before next batch...");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // seconds
    
    const finalResults: MultiSendResults = {
        totalBatches: batches.length,
        successfulBatches,
        failedBatches: batches.length - successfulBatches,
        totalGasUsed,
        totalRecipients: CONFIG.TOTAL_RECIPIENTS,
        executionTime,
        results
    };
    
    // Print summary
    console.log("\n🎉 Multi-Send Completed!");
    console.log("========================");
    console.log(`✅ Successful batches: ${successfulBatches}/${batches.length}`);
    console.log(`👥 Total recipients: ${CONFIG.TOTAL_RECIPIENTS}`);
    console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);
    console.log(`💰 Total gas cost: ${ethers.formatEther(totalGasUsed * gasPrice)} BNB`);
    console.log(`⏱️  Execution time: ${executionTime.toFixed(2)} seconds`);
    
    return finalResults;
}

/**
 * Execute multi-send for BNB
 */
async function executeMultiSendBNB(): Promise<MultiSendResults> {
    console.log("🚀 Starting Multi-Send BNB Distribution");
    console.log("=======================================");
    
    // Similar implementation for BNB
    // This is a simplified version - implement full logic as needed
    
    const recipients = generateSampleRecipients(10); // Small test
    const amount = ethers.parseEther("0.001"); // 0.001 BNB per recipient
    
    const [signer] = await ethers.getSigners();
    const multiSend = await ethers.getContractAt("MultiSend", CONFIG.MULTISEND_ADDRESS) as MultiSend;
    
    const gasPrice = ethers.parseUnits(CONFIG.GAS_PRICE_GWEI.toString(), "gwei");
    const totalAmount = amount * BigInt(recipients.length);
    
    const tx = await multiSend.multiSendBNBSameAmount(recipients, amount, {
        value: totalAmount,
        gasPrice: gasPrice
    });
    
    const receipt = await tx.wait();
    
    return {
        totalBatches: 1,
        successfulBatches: 1,
        failedBatches: 0,
        totalGasUsed: receipt!.gasUsed,
        totalRecipients: recipients.length,
        executionTime: 0,
        results: [{
            batchIndex: 0,
            recipients: recipients.length,
            gasUsed: receipt!.gasUsed,
            transactionHash: tx.hash,
            success: true
        }]
    };
}

if (require.main === module) {
    // Check configuration
    if (CONFIG.MULTISEND_ADDRESS === "0x...") {
        console.error("❌ Please update MULTISEND_ADDRESS in the configuration!");
        process.exit(1);
    }
    
    executeMultiSend()
        .then((results: MultiSendResults) => {
            console.log("\n📊 Final Results:", JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch((error: Error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}

export {
    executeMultiSend,
    executeMultiSendBNB,
    generateSampleRecipients,
    splitIntoBatches,
    CONFIG
};