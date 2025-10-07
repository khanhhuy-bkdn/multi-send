import { ethers } from "hardhat";
import { MultiSend, MockToken } from "../typechain-types";

interface GasResult {
    batchSize: number;
    tokenGas: string;
    bnbGas: string;
    gasPerRecipient: number;
    bnbGasPerRecipient: number;
}

interface CostEstimation {
    gasPrice: number; // in gwei
    totalCostBNB: string;
    totalCostUSD: string;
}

/**
 * Script to estimate gas cost for multi-send operation
 */
async function estimateGasCosts(): Promise<GasResult[]> {
    console.log("⛽ Gas Cost Estimation for Multi-Send");
    console.log("=".repeat(50));
    
    // Deploy contracts for testing
    console.log("📦 Deploying test contracts...");
    
    const MockToken = await ethers.getContractFactory("MockToken");
    const deployedMockToken = await MockToken.deploy("Test Token", "TEST", 1000000);
    await deployedMockToken.waitForDeployment();
    const mockToken = deployedMockToken as unknown as MockToken;
    
    const MultiSend = await ethers.getContractFactory("MultiSend");
    const deployedMultiSend = await MultiSend.deploy();
    await deployedMultiSend.waitForDeployment();
    const multiSend = deployedMultiSend as unknown as MultiSend;
    
    const [signer] = await ethers.getSigners();
    
    // Test different batch sizes
    const batchSizes = [1, 10, 50, 100, 250, 500];
    const results: GasResult[] = [];
    
    for (const batchSize of batchSizes) {
        console.log(`\n🧪 Testing batch size: ${batchSize}`);
        
        // Generate recipients
        const recipients: string[] = [];
        for (let i = 0; i < batchSize; i++) {
            recipients.push(ethers.Wallet.createRandom().address);
        }
        
        const amount = ethers.parseEther("1");
        const totalAmount = amount * BigInt(batchSize);
        
        // Approve tokens
        await mockToken.approve(await multiSend.getAddress(), totalAmount);
        
        try {
            // Estimate gas for token multi-send
            const gasEstimate = await multiSend.multiSendTokenSameAmount.estimateGas(
                await mockToken.getAddress(),
                recipients,
                amount
            );
            
            // Estimate gas for BNB multi-send
            const bnbGasEstimate = await multiSend.multiSendBNBSameAmount.estimateGas(
                recipients,
                ethers.parseEther("0.001"),
                { value: ethers.parseEther("0.001") * BigInt(batchSize) }
            );
            
            const result: GasResult = {
                batchSize,
                tokenGas: gasEstimate.toString(),
                bnbGas: bnbGasEstimate.toString(),
                gasPerRecipient: Math.round(Number(gasEstimate) / batchSize),
                bnbGasPerRecipient: Math.round(Number(bnbGasEstimate) / batchSize)
            };
            
            results.push(result);
            
            console.log(`   Token Gas: ${gasEstimate.toString().padStart(8)} (${result.gasPerRecipient} per recipient)`);
            console.log(`   BNB Gas:   ${bnbGasEstimate.toString().padStart(8)} (${result.bnbGasPerRecipient} per recipient)`);
            
        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }
    
    // Calculate costs for full deployment (125,312 users)
    console.log("\n💰 COST ESTIMATION FOR 125,312 USERS");
    console.log("=".repeat(50));
    
    const TOTAL_USERS = 125312;
    const BATCH_SIZE = 500;
    const TOTAL_BATCHES = Math.ceil(TOTAL_USERS / BATCH_SIZE);
    
    // Get gas estimate for 500 recipients
    const optimalResult = results.find(r => r.batchSize === 500);
    if (!optimalResult) {
        console.log("❌ Could not find gas estimate for 500 recipients");
        return results;
    }
    
    const GAS_PER_BATCH = BigInt(optimalResult.tokenGas);
    const TOTAL_GAS = GAS_PER_BATCH * BigInt(TOTAL_BATCHES);
    
    console.log(`📊 Total Users: ${TOTAL_USERS.toLocaleString()}`);
    console.log(`📦 Total Batches: ${TOTAL_BATCHES}`);
    console.log(`⛽ Gas per Batch: ${GAS_PER_BATCH.toString()}`);
    console.log(`⛽ Total Gas: ${TOTAL_GAS.toString()}`);
    
    // Calculate costs at different gas prices including 0.1 gwei
    const gasPrices = [0.1, 3, 5, 10, 20]; // in gwei
    const bnbPriceUSD = 300; // Assume $300 per BNB
    
    console.log("\n💸 Cost Estimates:");
    gasPrices.forEach(gasPriceGwei => {
        const gasPriceWei = ethers.parseUnits(gasPriceGwei.toString(), "gwei");
        const totalCostWei = TOTAL_GAS * gasPriceWei;
        const totalCostBNB = ethers.formatEther(totalCostWei);
        const totalCostUSD = (parseFloat(totalCostBNB) * bnbPriceUSD).toFixed(2);
        
        const label = gasPriceGwei === 0.1 ? "Ultra Low" : 
                     gasPriceGwei === 3 ? "Low" :
                     gasPriceGwei === 5 ? "Normal" :
                     gasPriceGwei === 10 ? "High" : "Very High";
        
        console.log(`💸 At ${gasPriceGwei} gwei (${label}): ${totalCostBNB} BNB (~$${totalCostUSD} USD)`);
    });
    
    console.log("\n🚀 OPTIMIZATION RECOMMENDATIONS");
    console.log("1. Use batch size of 500 for optimal gas efficiency");
    console.log("2. Execute during low network congestion (0.1-3 gwei)");
    console.log("3. Consider using multiSendTokenSameAmount for uniform distributions");
    console.log("4. Monitor gas prices and adjust timing accordingly");
    console.log("5. Test on BSC testnet first to verify gas estimates");
    
    // Time estimation
    console.log("\n⏰ TIME ESTIMATION");
    console.log("=".repeat(50));
    const avgBlockTime = 3; // BSC block time in seconds
    const estimatedTimeMinutes = Math.ceil((TOTAL_BATCHES * avgBlockTime) / 60);
    const estimatedTimeWithDelays = Math.ceil((TOTAL_BATCHES * (avgBlockTime + 2)) / 60); // 2s delay between batches
    
    console.log(`⏱️  Estimated time (conservative): ${estimatedTimeMinutes} minutes (${Math.ceil(estimatedTimeMinutes/60)} hours)`);
    console.log(`⏱️  With 2-second delays between batches: ${estimatedTimeWithDelays - estimatedTimeMinutes} additional minutes`);
    
    // Ultra low gas price analysis
    console.log("\n🔥 ULTRA LOW GAS PRICE ANALYSIS (0.1 gwei)");
    console.log("=".repeat(50));
    const ultraLowGasPrice = ethers.parseUnits("0.1", "gwei");
    const ultraLowCost = TOTAL_GAS * ultraLowGasPrice;
    const ultraLowCostBNB = ethers.formatEther(ultraLowCost);
    const ultraLowCostUSD = (parseFloat(ultraLowCostBNB) * bnbPriceUSD).toFixed(2);
    
    console.log(`💰 Total cost at 0.1 gwei: ${ultraLowCostBNB} BNB (~$${ultraLowCostUSD} USD)`);
    console.log(`📉 Savings vs 3 gwei: ${(parseFloat(ethers.formatEther(TOTAL_GAS * ethers.parseUnits("3", "gwei"))) - parseFloat(ultraLowCostBNB)).toFixed(6)} BNB`);
    console.log(`⚠️  Note: 0.1 gwei may result in slower transaction confirmation`);
    console.log(`📊 Recommended: Monitor network and use 0.1-1 gwei during low activity periods`);
    
    console.log("\n🎉 Gas estimation completed!");
    
    return results;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    estimateGasCosts()
        .then((results: GasResult[]) => {
            console.log("\n📊 Detailed Results:", JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch((error: Error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}

export default estimateGasCosts;