# SHOUJIKI DEPLOYMENT TODO
==========================

## 1. SOLANA INFRASTRUCTURE SETUP
- [ ] **Get a High-Performance RPC URL**: Use Helius, QuickNode, or Triton. Public Devnet RPCs will fail during payment verification due to rate limits.
- [ ] **Create a Squads V4 Multisig**: Go to [app.squads.so](https://app.squads.so/).
    - Note the **Multisig PDA** address.
    - Ensure your "Platform Wallet" (derived from the seed below) is added as a **Member** with full permissions.

## 2. CONFIGURATION (Environment Variables)

### Backend (`apps/api/.env`)
- [ ] `PLATFORM_SECRET_SEED`: Set a secure 32-character random string.
- [ ] `SOLANA_RPC_URL`: Your private RPC endpoint.
- [ ] `SQUADS_MULTISIG_PDA`: The address of the Squads multisig you created.
- [ ] `DATABASE_URL`: Change to a managed PostgreSQL instance for production (e.g., Supabase, Neon).
- [ ] `JWT_SECRET`: A long, unique string for securing user sessions.

### Frontend (`apps/web/.env.local`)
- [ ] `NEXT_PUBLIC_API_URL`: The public URL of your deployed API.
- [ ] `NEXT_PUBLIC_SOLANA_RPC_URL`: Match the backend RPC URL.
- [ ] `NEXT_PUBLIC_SQUADS_PROGRAM_ID`: Use `SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X` (Standard V4).

## 3. WALLET & FUNDING
- [ ] **Identify Platform Wallet**: Start the API once; it will log the `PLATFORM_WALLET` address.
- [ ] **Fund for Fees**: Send ~0.5 SOL to the Platform Wallet for transaction fees and rent.
- [ ] **Fund the Vault**: Send the SOL amount intended for developer payouts to the **Squads Vault PDA**.

## 4. AGENT METADATA
- [ ] **Metadata Strategy**: Choose Arweave (via Irys) or IPFS for hosting agent NFT metadata.
- [ ] **Update Service**: In `apps/api/modules/agents/service.py`, ensure the `metadata_uri` generation logic matches your hosting choice.

## 5. SECURITY & SANDBOX
- [ ] **Isolate Sandbox**: Deploy the `sandbox` container on a separate instance or restricted VPC.
- [ ] **Restrict Network**: Ensure the sandbox has **zero** access to your internal network and strictly limited outbound access.

## 6. DEPLOYMENT STEPS
- [ ] **Build Images**: `docker-compose build`
- [ ] **Run Services**: `docker-compose up -d`
- [ ] **Verify Node.js**: Ensure the backend container has `node` and `npm` installed (the current Dockerfile should handle this) to execute the Squads/Metaplex JS logic.

## 7. FINAL VALIDATION
- [ ] **Deploy Agent**: Confirm the Metaplex Core Mint appears on [Solscan](https://solscan.io/).
- [ ] **Pay & Run**: Confirm the `X402` signature gate allows the request only after the Solana Pay transfer is confirmed on-chain.
- [ ] **Verify Payout**: Confirm the Squads `VaultTransfer` transaction moves SOL from the vault to the creator's wallet.
