# SHOUJIKI DEV-READY DEPLOYMENT GUIDE (SOLANA DEVNET)
==================================================

This guide explains how to get a fully functional dev environment on Solana Devnet for FREE.

## 1. GET A FREE RPC URL (High Performance)
Public Devnet RPCs (`https://api.devnet.solana.com`) are heavily rate-limited and often fail the "Verification" phase of Shoujiki.
- [ ] Go to [Helius.dev](https://www.helius.dev/) or [QuickNode.com](https://www.quicknode.com/).
- [ ] Sign up for a **Free Tier** account.
- [ ] Create a New App and select **Solana Devnet**.
- [ ] **Copy your API URL** (it will look like `https://devnet.helius-rpc.com/?api-key=...`).

## 2. SETUP SQUADS V4 MULTISIG (On Devnet)
You need an on-chain vault to hold user payments before they are released to developers.
- [ ] Go to [app.squads.so](https://app.squads.so/).
- [ ] **Switch Network to Devnet** (Top right corner).
- [ ] Click **Create Multisig** -> Name it "Shoujiki Platform Vault".
- [ ] **Add Members**: Add your personal wallet (Phantom/Solflare) as the first member.
- [ ] **Note the Multisig Address**: Copy the address once created.
- [ ] **Find the Vault Address**: Under "Vault", copy the PDA address. This is where users will send SOL.

## 3. GET THE PLATFORM WALLET & FREE SOL
The "Platform Wallet" is derived from your `PLATFORM_SECRET_SEED`. It signs the payout transactions.
- [ ] Set a 32-character `PLATFORM_SECRET_SEED` in `apps/api/.env`.
- [ ] Run `docker-compose up api`.
- [ ] **Watch the logs**: Look for a line: `[INFO] Platform Wallet Derived: [ADDRESS]`.
- [ ] **Copy that Address**.
- [ ] **Go to a Faucet**: Visit [solfaucet.com](https://solfaucet.com/) or [faucet.quicknode.com](https://faucet.quicknode.com/).
- [ ] Paste the Platform Wallet address and request **1.0 Devnet SOL**.
- [ ] **Add Platform Wallet to Squads**: Go back to Squads, go to Settings -> Members, and add this Platform Wallet address as a member (so it has authority to execute transfers).

## 4. LOCAL CONFIGURATION (.env files)

**CRITICAL: If you get "Could not validate credentials":**
- Open your browser console (`F12`) and run: `localStorage.removeItem('shoujiki_token')`
- Refresh the page and **Login to API** again.
- This is required whenever you change your `SECRET_KEY`.

### Backend (`apps/api/.env`)

```env
DATABASE_URL=postgresql+asyncpg://shoujiki:shoujiki@db:5432/shoujiki
SANDBOX_URL=http://sandbox:8001
SOLANA_RPC_URL=your_helius_or_quicknode_devnet_url_here
SQUADS_MULTISIG_PDA=your_squads_multisig_address_here
PLATFORM_SECRET_SEED=your_secure_32_character_seed_here
SECRET_KEY=any_random_string_for_dev
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOLANA_RPC_URL=your_helius_or_quicknode_devnet_url_here
NEXT_PUBLIC_SQUADS_PROGRAM_ID=SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X
```

## 5. RUNNING THE SYSTEM
- [ ] **Build & Start**: `docker-compose up --build`
- [ ] **Deploy an Agent**: Go to the Dashboard, upload a ZIP, and set a price (e.g., 0.01 SOL). 
- [ ] **Check Solscan**: Verify the Agent Mint transaction appeared on [Solscan Devnet](https://solscan.io/?cluster=devnet).
- [ ] **Run Agent**: Use your personal wallet to "Pay & Run". If your personal wallet has 0 SOL, use the faucet mentioned in Step 3.

## 6. VERIFY THE FLOW
1. **Pay**: SOL moves from your wallet to the Squads Vault.
2. **Execute**: Sandbox runs the code.
3. **Payout**: SOL moves from the Squads Vault to the Creator Wallet (automatic).
