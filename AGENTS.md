# Arc Points Leaderboard

> Built with Arc Studio - money-powered apps in minutes

An onchain points leaderboard running on Arc Testnet. Wallets register a username once, and the contract owner awards test points. The leaderboard stays sorted onchain — no real money involved.

---

## What This App Does

- Users connect their wallet and register a unique username (once per wallet, 3–20 chars, alphanumeric/underscore)
- The contract owner awards test points to registered players
- A top-100 leaderboard sorted by points is maintained onchain and shown in the UI
- No real monetary value — purely for demo and testing

---

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.20 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/PointsLeaderboard.t.sol`
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002)
- Toasts: Sonner

## Key Files

| Path | Purpose |
|---|---|
| `contracts/PointsLeaderboard.sol` | Main contract — registration, points, leaderboard |
| `contracts/test/PointsLeaderboard.t.sol` | 43 Foundry unit tests (all pass) |
| `src/lib/contract.ts` | Contract ABI + address env read |
| `src/hooks/useLeaderboard.ts` | wagmi read hooks for leaderboard + player data |
| `src/components/LeaderboardApp.tsx` | Top-level UI shell |
| `src/components/RegisterPanel.tsx` | Username registration UI |
| `src/components/AwardPointsPanel.tsx` | Owner: award test points |
| `src/components/LeaderboardTable.tsx` | Live leaderboard display |
| `src/App.tsx` | Thin root — imports LeaderboardApp |

---

## Deployed Contracts

| Contract | Chain | Address | Deployer |
|---|---|---|---|
| PointsLeaderboard | Arc Testnet | `0x330a784feb153f5cf95a64115b114c3c67980ee7` | Platform deployer wallet (Circle SCP) |
| PointsLeaderboard v1 (deprecated) | Arc Testnet | `0x3ddbc3aa02b99d748ab7a9811369d7fc79a600f4` | Platform deployer wallet (Circle SCP) |

After deploying, update the table above and set the env var below.

---

## Deployment Instructions (Step by Step)

### Prerequisites

- [Foundry](https://getfoundry.sh/) installed (`forge --version`)
- A wallet with some Arc Testnet USDC for gas (use the "Get test USDC" button in the Arc Studio sidebar)
- Your wallet private key ready (keep it secret — never commit it)

### Step 1 — Build the contract

```bash
cd /home/user/app
forge build
```

Expected output: `Compiler run successful! Artifact(s) written to contracts/out/`

### Step 2 — Deploy via Arc Studio (recommended)

In the Arc Studio chat, type:

> "Deploy the PointsLeaderboard contract to Arc Testnet"

Arc Studio will deploy it for you and give you the contract address. The deployer wallet becomes the contract owner — use that wallet to award points.

### Step 3 — Self-deploy (alternative, you own the wallet)

```bash
# Set your private key in .env (never commit .env)
# DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere

# Deploy to Arc Testnet (reads DEPLOYER_PRIVATE_KEY from .env)
forge create \
  --rpc-url https://rpc.testnet.arc.io \
  --private-key $DEPLOYER_PRIVATE_KEY \
  contracts/PointsLeaderboard.sol:PointsLeaderboard
```

Note the `Deployed to:` address from the output.

### Step 4 — Wire the address into the frontend

Add the deployed address to `.env`:

```
VITE_LEADERBOARD_ADDRESS=0xYourDeployedContractAddress
```

Then restart the dev server (Vite reads `.env` only at startup):

```bash
bun run dev
```

### Step 5 — Verify it works

1. Open the app in your browser
2. Connect the deployer wallet
3. Register a username
4. Use "Award Points" to add test points to yourself
5. The leaderboard should show your entry at the top

---

## Running Tests

```bash
# Run all unit tests
forge test

# Run with gas report
forge test --gas-report

# Run with verbose output
forge test -vvv
```

All 43 tests should pass. Test coverage includes:
- Happy path (register, award, leaderboard sorting)
- Revert conditions (duplicate wallet, taken username, invalid format, wrong owner)
- Events (PlayerRegistered, PointsAwarded)
- Fuzz testing (random point amounts, accumulation correctness)

---

## Contract Interface

### Functions anyone can call

```solidity
registerUsername(string username)  // Register once per wallet
getLeaderboard()                   // Returns top-100 sorted entries
getPlayer(address)                 // Returns a player's profile
isRegistered(address)              // True/false check
```

### Functions only the owner (deployer) can call

```solidity
awardPoints(address player, uint256 amount)                         // Award points to one player
awardPointsBatch(address[] players, uint256[] amounts)              // Award to many at once
```

### Custom errors

```
UsernameTaken       — someone else has that username
UsernameInvalid     — format wrong (length or characters)
AlreadyRegistered   — that wallet already registered
NotRegistered       — target wallet has no account
NotOwner            — caller is not the deployer
```

---

## Notes

- No real money is used or transferred. USDC on Arc Testnet is test-only.
- The leaderboard holds at most 100 wallets (sorted onchain on every points award).
- The contract uses Paris EVM target (required for Arc Testnet).
- OpenZeppelin 5.1.0 is pinned — do not upgrade (5.2.0+ uses a Cancun opcode Arc Testnet does not support).
