# Chain of Hope – Blockchain-based Blood & Organ Donation System

## Description
This decentralized application (DApp) manages blood and organ donation using Ethereum smart contracts.
It allows donors and recipients to register, automatically find compatible matches based on real-world rules,
and record transactions securely on the blockchain.

## Requirements
- Node.js and npm
- Hardhat (for compiling and deploying)
- MetaMask wallet
- Ganache (for local blockchain testing)

## Steps to Execute

1. Clone the repository:
   git clone https://github.com/<your-username>/chain-of-hope.git

2. Install dependencies:
   cd chain-of-hope
   npm install

3. Compile and deploy smart contract:
   npx hardhat compile
   npx hardhat node
   npx hardhat run scripts/deploy.js --network localhost

4. Start the frontend:
   cd frontend
   npm install
   npm start

5. Connect MetaMask to localhost (http://127.0.0.1:8545) and use Ganache accounts.

6. Register donors and recipients, and test auto-matching and finalization.
