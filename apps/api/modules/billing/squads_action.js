const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const multisig = require('@sqds/multisig');
const bs58 = require('bs58');

/**
 * Executes a real Squads V4 vault transfer.
 * Assumes the platform keypair has authority to create and execute transactions on the multisig.
 */
async function executeSquadsPayout(rpcUrl, secretKey, multisigAddress, creatorWallet, amount) {
  const connection = new Connection(rpcUrl, 'confirmed');
  const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
  const multisigPda = new PublicKey(multisigAddress);
  const creatorPubkey = new PublicKey(creatorWallet);
  
  // Convert SOL to Lamports (as BigInt)
  const amountLamports = BigInt(Math.round(amount * 1e9));

  try {
    // 1. Fetch multisig account to get the next transaction index
    const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
    const transactionIndex = BigInt(Number(multisigAccount.transactionIndex) + 1);

    // 2. Derive Vault PDA (Default vault index is 0)
    const [vaultPda] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });

    console.log(`Squads: Creating transfer from ${vaultPda.toBase58()} to ${creatorPubkey.toBase58()}`);

    // 3. Create the multisig transaction with a VaultTransfer instruction
    // Note: In Squads V4, we create a 'transaction' account that holds the instructions
    const { signature: createSig } = await multisig.rpc.multisigTransactionCreate({
      connection,
      feePayer: keypair,
      multisigPda,
      transactionIndex,
      creator: keypair.publicKey,
      vaultIndex: 0,
      instructions: [
        multisig.instructions.vaultTransfer({
          multisigPda,
          vaultPda,
          creator: keypair.publicKey,
          recipient: creatorPubkey,
          lamports: amountLamports,
        }),
      ],
    });

    console.log(`Squads: Transaction created: ${createSig}`);

    // 4. Approve the transaction
    await multisig.rpc.multisigTransactionApprove({
      connection,
      feePayer: keypair,
      multisigPda,
      transactionIndex,
      member: keypair.publicKey,
    });

    // 5. Execute the transaction
    const { signature: execSig } = await multisig.rpc.multisigTransactionExecute({
      connection,
      feePayer: keypair,
      multisigPda,
      transactionIndex,
      member: keypair, // Executor
    });

    return execSig;
  } catch (error) {
    console.error("Squads Execution Error:", error);
    throw error;
  }
}

const args = process.argv.slice(2);
if (args.length < 5) {
  console.error("Missing arguments: rpcUrl secretKey multisigAddress creatorWallet amount");
  process.exit(1);
}

executeSquadsPayout(args[0], args[1], args[2], args[3], parseFloat(args[4]))
  .then(sig => console.log(sig))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
