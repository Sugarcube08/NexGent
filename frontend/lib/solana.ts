import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';

// A valid devnet dummy address
export const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || "675kSimabH286zbR47u6oZsZ4C9YPrY7T4mF7Wv7V19";

export const createPaymentTransaction = async (
  fromPubkey: PublicKey,
  amount: number
) => {
  if (!PLATFORM_WALLET) {
    throw new Error("Platform wallet not configured");
  }
  
  try {
    const toPubkey = new PublicKey(PLATFORM_WALLET);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );
    return transaction;
  } catch (err) {
    console.error("Invalid PLATFORM_WALLET:", PLATFORM_WALLET);
    throw new Error("Invalid platform wallet address");
  }
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
