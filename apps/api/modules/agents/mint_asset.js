/**
 * Rebuilt Agent Minting using Standardized Principles
 */
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { create, mplCore } = require('@metaplex-foundation/mpl-core');
const { generateSigner, keypairIdentity } = require('@metaplex-foundation/umi');
const bs58 = require('bs58');

async function mintAgentAsset(rpcUrl, secretKey, name, uri) {
  const umi = createUmi(rpcUrl).use(mplCore());
  
  // Platform authority
  const keypair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(secretKey));
  umi.use(keypairIdentity(keypair));

  const assetSigner = generateSigner(umi);

  // Minting as a Metaplex Core Asset - The new standard for Solana Assets
  // This provides a lightweight, highly composable identity for the agent
  await create(umi, {
    asset: assetSigner,
    name: name,
    uri: uri, // Points to Metadata (Arweave/IPFS) containing Agent capabilities
  }).sendAndConfirm(umi);

  return assetSigner.publicKey.toString();
}

const args = process.argv.slice(2);
if (args.length < 4) process.exit(1);

mintAgentAsset(args[0], args[1], args[2], args[3])
  .then(address => console.log(address))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
