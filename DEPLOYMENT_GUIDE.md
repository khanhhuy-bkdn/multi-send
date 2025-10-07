# 🚀 MultiSend Contract Deployment Guide for BSC

## 📋 Pre-deployment Checklist

### 1. Environment Preparation
- [ ] Node.js >= 16.0.0 installed
- [ ] Wallet has sufficient BNB for gas fees (~0.1 BNB)
- [ ] Wallet private key backed up securely
- [ ] BSCScan API key (for contract verification)

### 2. Project Configuration
- [ ] Clone repository and install dependencies
- [ ] Create `.env` file from `.env.example`
- [ ] Fill in private key and BSCScan API key
- [ ] Test on local network first

## 🔧 Deployment Steps

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Compile contracts
```bash
npx hardhat compile
```

### Step 3: Run tests
```bash
npx hardhat test
```

### Step 4: Deploy to BSC Testnet (recommended)
```bash
npm run deploy:bsc-testnet
```

### Step 5: Test on testnet
- Send a few test transactions
- Verify gas costs
- Check events and logs

### Step 6: Deploy to BSC Mainnet
```bash
npm run deploy:bsc-mainnet
```

### Step 7: Verify contract
```bash
npx hardhat verify --network bsc-mainnet <CONTRACT_ADDRESS>
```

## 💰 Cost Estimation (125,312 users)

| Scenario | Gas Price | Total Cost | USD (BNB @ $300) |
|----------|-----------|------------|-------------------|
| **Optimal** | 3 gwei | 11.35 BNB | $3,404 |
| **Normal** | 5 gwei | 18.91 BNB | $5,673 |
| **High** | 10 gwei | 37.82 BNB | $11,346 |
| **Very High** | 20 gwei | 75.64 BNB | $22,691 |

**Recommendation**: Deploy and execute when gas price is 3-5 gwei.

## ⏰ Execution Time

- **251 batches** × 500 users per batch
- **Estimated time**: 13-22 minutes
- **BSC block time**: ~3 seconds
- **Recommendation**: Add 2s delay between batches

## 📊 Technical Specifications

### Gas Usage per Batch Size
| Recipients | Gas Used | Gas/Recipient |
|------------|----------|---------------|
| 1 | 123,675 | 123,675 |
| 10 | 392,704 | 39,270 |
| 50 | 1,590,942 | 31,819 |
| 100 | 3,086,111 | 30,861 |
| 250 | 7,604,417 | 30,418 |
| **500** | **15,067,376** | **30,135** |

**Conclusion**: Batch size 500 is most optimal for gas efficiency.

## 🔒 Security Checklist

- [ ] Contract has been audited (code review)
- [ ] Private key stored securely
- [ ] Test on testnet before mainnet
- [ ] Backup transaction hashes
- [ ] Monitor contract after deployment
- [ ] Verify contract source code on BSCScan

## 📝 Post-deployment

### 1. Save contract information
```json
{
  "contractAddress": "0x...",
  "network": "bsc-mainnet",
  "deploymentTx": "0x...",
  "blockNumber": 12345678,
  "gasUsed": "1660511"
}
```

### 2. Verify on BSCScan
- Contract source code
- Constructor arguments
- Compiler version and settings

### 3. Prepare for multi-send
- Prepare list of 125,312 addresses
- Approve tokens for contract
- Split into 251 batches × 500 users

## 🚨 Troubleshooting

### Common Errors

**1. "Insufficient funds for gas"**
- Check BNB balance
- Reduce gas price or add more BNB

**2. "Nonce too low/high"**
- Reset MetaMask account
- Or wait a few minutes and try again

**3. "Contract creation failed"**
- Check gas limit
- Verify network configuration

**4. "Verification failed"**
- Check compiler version
- Ensure source code is correct

### Gas price monitoring
- BSCScan Gas Tracker: https://bscscan.com/gastracker
- DeFiPulse BSC Gas: https://bsc.defipulse.com/gas

## 📞 Support

If you encounter issues:
1. Check logs and error messages
2. Verify on BSCScan
3. Test on testnet first
4. Check network status and gas prices

## ✅ Final Checklist

Before starting multi-send for 125,312 users:

- [ ] Contract deployed and verified successfully
- [ ] Test with small batch first (10-50 users)
- [ ] Tokens approved sufficiently for contract
- [ ] Gas price at optimal level (3-5 gwei)
- [ ] Backup all transaction hashes
- [ ] Monitor progress and ready to handle errors

**🎯 Goal**: Complete 125,312 transfers in ~20 minutes with cost ~$3,400-5,700 USD.