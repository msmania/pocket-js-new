import "dotenv/config";
import { JsonRpcProvider } from "@pokt-foundation/pocketjs-provider";
import { KeyManager } from "@pokt-foundation/pocketjs-signer";
import { Relayer } from "@pokt-foundation/pocketjs-relayer";
import { TransactionBuilder } from "@pokt-foundation/pocketjs-transaction-builder";

const PoktEndpoint = process.env.POKT_ENDPOINT;
const AppPrivateKey = process.env.APP_PRIVATE_KEY;
const TxSignerKey = process.env.SIGNER_PRIVATE_KEY;

async function main() {
  const provider = new JsonRpcProvider({
    rpcUrl: PoktEndpoint,
    dispatchers: [PoktEndpoint],
  });
  const clientSigner = await KeyManager.createRandom();
  const appSigner = await KeyManager.fromPrivateKey(AppPrivateKey);
  const relayer = new Relayer({
    keyManager: clientSigner,
    provider,
  });
  const aat = await Relayer.GenerateAAT(
    appSigner,
    clientSigner.publicKey,
  );

  const height = await provider.getBlockNumber();
  console.log(height);

  const txSigner = await KeyManager.fromPrivateKey(TxSignerKey);
  const transactionBuilder = new TransactionBuilder({
    provider,
    signer: txSigner,
    chainID: "testnet",
  });
  // Create a new `Send` Message which is used to send funds over the network.
  const sendMsg = transactionBuilder.send({
    fromAddress: txSigner.getAddress(),
    toAddress: "07a6fca4dea9f01e4c19f301df0d0afac128561b",
    // Amount in uPOKT (1 POKT = 1*10^6 uPOKT)
    amount: "1000000",
  });
  // Send it over the network!
  const txResponse = await transactionBuilder.submit({
    memo: "POKT Payment",
    txMsg: sendMsg,
  });
  console.log(txResponse.txHash);

  const chain = '005A';
  const payload = {"id":1,"jsonrpc":"2.0","method":"eth_chainId"};

  const sessionResp = await provider.dispatch({
    sessionHeader: {
      sessionBlockHeight: 0,
      chain,
      applicationPubKey: appSigner.publicKey,
    },
  });

  const relayResp = await relayer.relay({
    blockchain: chain,
    data: JSON.stringify(payload),
    pocketAAT: aat,
    session: sessionResp.session,
    options: {
      retryAttempts: 5,
      rejectSelfSignedCertificates: false,
      timeout: 8000,
    },
  });

  console.log(relayResp.response);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
