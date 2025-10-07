import { ethers } from "hardhat";
import hre from "hardhat";

interface DeploymentInfo {
    network: string;
    contractAddress: string;
    deployerAddress: string;
    transactionHash: string;
    blockNumber: number | null;
    timestamp: string;
    maxRecipientsPerBatch: string;
    gasUsed: string;
}

async function main(): Promise<void> {
    console.log("🚀 Deploying MultiSend contract to BSC...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "BNB");
    
    if (balance < ethers.parseEther("0.01")) {
        console.warn("⚠️  Warning: Low balance. Make sure you have enough BNB for deployment.");
    }
    
    // Deploy MultiSend contract
    console.log("\n📦 Deploying MultiSend contract...");
    const MultiSend = await ethers.getContractFactory("MultiSend");
    const multiSend = await MultiSend.deploy();
    
    await multiSend.waitForDeployment();
    const contractAddress = await multiSend.getAddress();
    
    console.log("✅ MultiSend deployed to:", contractAddress);
    console.log("🔗 Transaction hash:", multiSend.deploymentTransaction()?.hash);
    
    // Get contract info
    const [batchCounter, maxRecipients, owner] = await multiSend.getContractInfo();
    console.log("\n📊 Contract Info:");
    console.log("   Owner:", owner);
    console.log("   Max Recipients per Batch:", maxRecipients.toString());
    console.log("   Current Batch Counter:", batchCounter.toString());
    
    // Save deployment info
    const deploymentInfo: DeploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        deployerAddress: deployer.address,
        transactionHash: multiSend.deploymentTransaction()?.hash || "",
        blockNumber: multiSend.deploymentTransaction()?.blockNumber || null,
        timestamp: new Date().toISOString(),
        maxRecipientsPerBatch: maxRecipients.toString(),
        gasUsed: multiSend.deploymentTransaction()?.gasLimit?.toString() || "N/A"
    };
    
    console.log("\n💾 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // Instructions for verification
    console.log("\n🔍 To verify the contract on BSCScan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Next steps:");
    console.log("1. Verify the contract on BSCScan");
    console.log("2. Test the contract with small batches first");
    console.log("3. Prepare your recipient list for multi-send");
    console.log("4. Approve tokens before calling multi-send functions");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error: Error) => {
            console.error(error);
            process.exit(1);
        });
}

export default main;