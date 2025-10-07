# 🚀 MultiSend Contract - BSC Token Distribution

Optimized smart contract for sending ERC20 tokens and BNB to multiple addresses simultaneously on Binance Smart Chain (BSC). Supports sending to up to 500 recipients per batch, suitable for token distribution to 125,312 users.

## ✨ Key Features

- 🎯 **Batch Processing**: Send to up to 500 users per transaction
- ⛽ **Gas Optimized**: Gas optimized for BSC network
- 🔒 **Security**: Uses OpenZeppelin contracts, ReentrancyGuard
- 💰 **Multi-Asset**: Supports both ERC20 tokens and BNB
- 📊 **Event Tracking**: Track each transaction with batch ID
- 🛡️ **Emergency Functions**: Emergency withdraw for owner
- 🔧 **Configurable**: Adjustable batch size

## 📋 System Requirements

- Node.js >= 16.0.0
- npm or yarn
- Hardhat
- BSC wallet with BNB for gas fees

## 🛠️ Installation

1. **Clone repository and install dependencies:**
```bash
git clone <repository-url>
cd multi-send
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit the `.env` file:
```env
PRIVATE_KEY=your_private_key_without_0x
BSCSCAN_API_KEY=your_bscscan_api_key
```

3. **Compile contracts:**
```bash
npm run compile
```

4. **Run tests:**
```bash
npm test
```

## 🚀 Deployment

### BSC Testnet
```bash
npm run deploy:bsc-testnet
```

### BSC Mainnet
```bash
npm run deploy:bsc-mainnet
```

### Verify contract on BSCScan
```bash
npx hardhat verify --network bsc-mainnet <CONTRACT_ADDRESS>
```

## 📖 Usage

### 1. Send ERC20 tokens with different amounts

```javascript
const recipients = [
    { wallet: "0x...", amount: ethers.parseEther("10") },
    { wallet: "0x...", amount: ethers.parseEther("20") },
    { wallet: "0x...", amount: ethers.parseEther("30") }
];

await multiSend.multiSendToken(tokenAddress, recipients);
```

### 2. Send same amount to multiple users (Gas efficient)

```javascript
const recipients = ["0x...", "0x...", "0x..."];
const amount = ethers.parseEther("100");

await multiSend.multiSendTokenSameAmount(tokenAddress, recipients, amount);
```

### 3. Send BNB

```javascript
const recipients = [
    { wallet: "0x...", amount: ethers.parseEther("0.1") },
    { wallet: "0x...", amount: ethers.parseEther("0.2") }
];

const totalBNB = ethers.parseEther("0.3");
await multiSend.multiSendBNB(recipients, { value: totalBNB });
```

### 4. Send same amount BNB to multiple users

```javascript
const recipients = ["0x...", "0x...", "0x..."];
const amount = ethers.parseEther("0.1");
const totalBNB = amount * BigInt(recipients.length);

await multiSend.multiSendBNBSameAmount(recipients, amount, { value: totalBNB });
```

## 🔧 Available Scripts

### Gas Estimation
Estimate gas cost for sending to 125,312 users:
```bash
npx hardhat run scripts/gas-estimation.js
```

### Example Multi-Send
Demo sending tokens to 500 users:
```bash
npx hardhat run scripts/example-multisend.js --network bsc-mainnet
```

## 💰 Cost Estimation

For 125,312 users (251 batches × 500 users):

| Gas Price | Total Cost | USD (BNB @ $300) |
|-----------|------------|-------------------|
| 3 gwei    | ~0.75 BNB  | ~$225            |
| 5 gwei    | ~1.25 BNB  | ~$375            |
| 10 gwei   | ~2.5 BNB   | ~$750            |
| 20 gwei   | ~5.0 BNB   | ~$1,500          |

**Recommendation**: Execute when gas price is 3-5 gwei to save costs.

## ⏰ Execution Time

- **Conservative estimate**: ~12-15 minutes
- **With 2s delay between batches**: ~20-25 minutes
- **Total batches**: 251 batches

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Only owner can execute admin functions
- **Input validation**: Validates all inputs
- **Emergency withdraw**: Owner can withdraw funds in emergency situations

## 📊 Contract Functions

### Public Functions

| Function | Description | Gas Estimate |
|----------|-------------|--------------|
| `multiSendToken` | Send tokens with different amounts | ~20k + 21k per recipient |
| `multiSendTokenSameAmount` | Send same amount (gas efficient) | ~15k + 18k per recipient |
| `multiSendBNB` | Send BNB with different amounts | ~18k + 19k per recipient |
| `multiSendBNBSameAmount` | Send same amount BNB | ~13k + 16k per recipient |

### Admin Functions (Owner only)

| Function | Description |
|----------|-------------|
| `setMaxRecipientsPerBatch` | Update max recipients per batch |
| `emergencyWithdraw` | Emergency withdraw tokens/BNB |

### View Functions

| Function | Description |
|----------|-------------|
| `getContractInfo` | Get contract information |
| `isBatchProcessed` | Check if batch has been processed |

## 🧪 Testing

Run full test suite:
```bash
npm test
```

Test with gas reporting:
```bash
npx hardhat test --gas-reporter
```

Test specific file:
```bash
npx hardhat test test/MultiSend.test.js
```

## 📝 Example Usage for 125,312 users

```javascript
// 1. Prepare recipients list
const allRecipients = loadRecipientsFromFile(); // 125,312 addresses

// 2. Split into batches
const batches = splitIntoBatches(allRecipients, 500);

// 3. Approve tokens
const totalAmount = amount * BigInt(allRecipients.length);
await token.approve(multiSendAddress, totalAmount);

// 4. Execute each batch
for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length}`);
    
    await multiSend.multiSendTokenSameAmount(
        tokenAddress,
        batches[i],
        amount
    );
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
}
```

## ⚠️ Important Notes

1. **Test on testnet first**: Always test on BSC testnet before mainnet deployment
2. **Backup private key**: Store private key securely
3. **Monitor gas prices**: Use tools like BSCScan to monitor gas prices
4. **Batch size**: Do not exceed 500 recipients per batch
5. **Token approval**: Ensure sufficient token approval before sending
6. **Network congestion**: Avoid execution during network congestion

## 🐛 Troubleshooting

### Common Issues

**1. "Insufficient allowance" error:**
```bash
# Check allowance
await token.allowance(senderAddress, multiSendAddress);

# Approve more tokens
await token.approve(multiSendAddress, requiredAmount);
```

**2. "Too many recipients" error:**
- Reduce batch size to under 500

**3. "Insufficient gas" error:**
- Increase gas limit or wait for gas price to decrease

**4. Transaction timeout:**
- Increase gas price or retry transaction

## 📞 Support

If you encounter issues, please:
1. Check logs and error messages
2. Verify contract on BSCScan
3. Test on BSC testnet first
4. Check gas prices and network status

## 📄 License

MIT License - see LICENSE file for more details.

---

**⚡ Pro Tips:**
- Use `multiSendTokenSameAmount` instead of `multiSendToken` when sending same amount to save gas
- Monitor BSC gas tracker to choose optimal timing
- Backup transaction hashes to track progress
- Use event logs to verify successful transfers