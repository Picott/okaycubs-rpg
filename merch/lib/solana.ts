import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

const RPC_ENDPOINT = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const MERCHANT_WALLET = new PublicKey(process.env.MERCHANT_SOLANA_WALLET!);

/** Solana Pay URL for an exact lamport amount. The amount is computed server-side by the caller. */
export function createPaymentURL(params: { lamports: number; label: string; message: string; memo: string }) {
  const reference = Keypair.generate().publicKey;   // unique, unguessable per payment
  const amount = new BigNumber(params.lamports).dividedBy(LAMPORTS_PER_SOL);
  const url = encodeURL({
    recipient:  MERCHANT_WALLET,
    amount,
    reference,
    label:      params.label,
    message:    params.message,
    memo:       params.memo,
  });
  return { url, reference };
}

export async function verifySolanaPayment(reference: string, expectedLamports: number) {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const referenceKey = new PublicKey(reference);
  try {
    const sig = await findReference(connection, referenceKey, { finality: 'confirmed' });
    await validateTransfer(
      connection,
      sig.signature,
      { recipient: MERCHANT_WALLET, amount: new BigNumber(expectedLamports).dividedBy(LAMPORTS_PER_SOL) },
      { commitment: 'confirmed' }
    );
    return { verified: true as const, signature: sig.signature };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // anything that is not a definite mismatch (wrong amount / recipient) is 'not yet': keep polling
    const pending = !/amount|recipient|not transferred|invalid/i.test(msg);
    return { verified: false as const, signature: null, pending, error: msg };
  }
}
