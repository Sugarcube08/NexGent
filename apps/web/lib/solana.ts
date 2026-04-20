import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection, Keypair } from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';

// Squads V4 Program ID
const SQUADS_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_SQUADS_PROGRAM_ID || "SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X");

// Deterministic platform wallet matching backend
const PLATFORM_SEED = "shoujiki_escrow_platform_secret_32".padEnd(32).slice(0, 32);
const platformKeypair = Keypair.fromSeed(new TextEncoder().encode(PLATFORM_SEED));
export const PLATFORM_WALLET = platformKeypair.publicKey.toBase58();

export const createEscrowTransaction = async (
  fromPubkey: PublicKey,
  agentCreatorPubkey: PublicKey,
  taskId: string,
  amountSol: number
) => {
  const amount = Math.round(amountSol * LAMPORTS_PER_SOL);
  const platformPubkey = new PublicKey(PLATFORM_WALLET);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: platformPubkey,
      lamports: amount,
    })
  );
  
  // Attach task reference
  const reference = Keypair.generate().publicKey;
  tx.instructions[0].keys.push({ pubkey: reference, isSigner: false, isWritable: false });

  return tx;
};

export const createSolanaPayURL = (recipient: PublicKey, amount: number, reference: PublicKey, label: string, message: string) => {
  const url = encodeURL({
    recipient,
    amount: new BigNumber(amount),
    reference,
    label,
    message,
  });
  return url;
};

export const confirmTx = async (connection: Connection, signature: string) => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  }, 'confirmed');
  return true;
};
