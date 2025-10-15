# Decentralized Crowdfunding DApp

A blockchain-based crowdfunding platform built using **Solidity, Hardhat, React.js, and Ethers.js**. The application allows users to launch fundraising campaigns, contribute Ether, and withdraw funds through smart contracts, with a KYC verification system to control campaign creation.

## Overview

The Decentralized Crowdfunding DApp provides a transparent and decentralized way to raise funds on the Ethereum blockchain. It consists of two smart contracts, a React frontend, and MetaMask wallet integration for blockchain interactions.

## Features

### 1. KYC Verification

* Users can submit KYC requests with their name and CNIC.
* The administrator can review, approve, or reject verification requests.
* Only verified users or the administrator can create crowdfunding campaigns.

### 2. Campaign Creation

* Verified users can create campaigns by providing:

  * Campaign title
  * Description
  * Funding goal in ETH
* Campaign creation emits a `CampaignCreated` event.

### 3. Campaign Listing

* Displays campaign titles, descriptions, funding goals, amounts raised, creators, and campaign statuses.
* Provides contribution options for active campaigns.

### 4. Contributions

* Users can contribute Ether to active campaigns without requiring KYC approval.
* Contributions are recorded through smart contract transactions.
* Campaigns are marked as completed when their funding goals are reached.

### 5. Fund Withdrawal

* Campaign creators can withdraw funds from completed campaigns.
* The campaign status is updated after withdrawal.

### 6. MetaMask Integration

* Connects users' MetaMask wallets to the application.
* Displays wallet information, including the connected address and balance.
* Enables blockchain transactions through the connected wallet.
* Provides transaction confirmations and error messages through the frontend.

## Technology Stack

| Technology | Purpose                                       |
| ---------- | --------------------------------------------- |
| Solidity   | Smart contract development                    |
| Hardhat    | Compilation, local blockchain, and deployment |
| React.js   | Frontend application                          |
| Ethers.js  | Blockchain and wallet interaction             |
| MetaMask   | Wallet connection and transaction signing     |
| JavaScript | Frontend and deployment logic                 |

## Project Structure

```text
crowdfunding-dapp-famia/
├── contracts/
│   ├── Crowdfunding_FamiaMalik.sol
│   └── KYCRegistry_FamiaMalik.sol
├── deployments/
│   └── deployment-localhost.json
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── frontend-config/
│   ├── config.js
│   └── config.json
├── ignition/
│   └── modules/
├── .gitignore
├── hardhat.config.cjs
└── hardhat.config.js
```

## Prerequisites

Install the following before running the application:

* [Node.js and npm](https://nodejs.org/)
* [MetaMask](https://metamask.io/)
* Git
* A modern web browser

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/famiamalik/Decentralized-Crowdfunding-DApp.git
cd Decentralized-Crowdfunding-DApp
```

### 2. Install project dependencies

Install the Hardhat dependencies from the project root:

```bash
npm install
```

Install the React frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

### 3. Start the local Hardhat blockchain

Open a terminal in the project root and run:

```bash
npx hardhat node
```

Keep this terminal running. Hardhat provides local test accounts and a local Ethereum-compatible blockchain.

### 4. Compile the smart contracts

Open a second terminal in the project root:

```bash
npx hardhat compile
```

### 5. Deploy the smart contracts

Deploy the contracts using the deployment script or Hardhat Ignition module configured for this project.

For example, if using a deployment script:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Make sure the deployment command matches the scripts or Ignition modules available in the repository. Update the frontend contract addresses and configuration after deployment if necessary.

### 6. Configure MetaMask

Add the local Hardhat network to MetaMask using the following settings:

| Setting         | Value                   |
| --------------- | ----------------------- |
| Network Name    | Hardhat Local           |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency Symbol | ETH                     |

Import a test account using a private key displayed by the local Hardhat node. **Use local test accounts only. Never import a real wallet's private key into a development environment or share it publicly.**

### 7. Start the React application

From the project root:

```bash
cd frontend
npm start
```

The application should open in your browser at the local development address displayed by React, usually `http://localhost:3000`.

## Smart Contracts

### `KYCRegistry_FamiaMalik.sol`

Manages KYC submissions, verification requests, approvals, and rejections.

### `Crowdfunding_FamiaMalik.sol`

Manages campaign creation, campaign information, Ether contributions, funding progress, and withdrawals.

## Testing and Demonstration

The application can be demonstrated on a local Hardhat blockchain using MetaMask accounts. Suggested demonstration scenarios include:

1. Submitting a KYC request.
2. Approving or rejecting a KYC request as the administrator.
3. Creating a campaign with a funding goal.
4. Contributing Ether to a campaign.
5. Completing a campaign by reaching its funding goal.
6. Withdrawing funds as the campaign creator.



## Network and Deployment Notes

The included deployment configuration references the local Hardhat network. Contract addresses from a local deployment are valid for that local blockchain instance and may need to be updated after restarting or redeploying the network.

This project is configured for local development and demonstration unless separately deployed to a public testnet or mainnet.



