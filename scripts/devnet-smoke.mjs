import {
  airdropFactory,
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const websocketUrl = rpcUrl.replace(/^http/, "ws");
const rpc = createSolanaRpc(devnet(rpcUrl));
const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(websocketUrl));
const payer = await generateKeyPairSigner();
const recipient = await generateKeyPairSigner();

const airdrop = airdropFactory({ rpc, rpcSubscriptions });
await airdrop({
  commitment: "confirmed",
  recipientAddress: payer.address,
  lamports: lamports(20_000_000n),
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(payer, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstruction(
    getTransferSolInstruction({ source: payer, destination: recipient.address, amount: lamports(1_000_000n) }),
    tx,
  ),
);

const transaction = await signTransactionMessageWithSigners(message);
await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(transaction, { commitment: "confirmed" });
const signature = getSignatureFromTransaction(transaction);

console.log(JSON.stringify({
  network: "devnet",
  payer: payer.address,
  recipient: recipient.address,
  signature,
  explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
}, null, 2));
