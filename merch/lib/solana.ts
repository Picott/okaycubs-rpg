import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

const RPC_ENDPOINT = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const MERCHANT_WALLET = new PublicKey(process.env.MERCHANT_SOLANA_WALLET!);

export function createPaymentURL(params: {
  amountUsd: number;
  solPriceUsd: number;
  label: string;
  message: string;
  memo: string;
}): { url: URL; reference: PublicKey; lamports: number } {
  const solAmount  = new BigNumber(params.amountUsd / params.solPriceUsd).toFixed(6);
  const lamports   = Math.round(parseFloat(solAmount) * LAMPORTS_PER_SOL);
  // Generate a unique reference key for this payment — used to identify it on-chain
  const reference  = new PublicKey(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  );

  const url = encodeURL({
    recipient:  MERCHANT_WALLET,
    amount:     new BigNumber(solAmount),
    reference,
    label:      params.label,
    message:    params.message,
    memo:       params.memo,
  });

  return { url, reference, lamports };
}

export async function verifySolanaPayment(reference: string, expectedLamports: number) {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const referenceKey = new PublicKey(reference);

  try {
    const sig = await findReference(connection, referenceKey, { finality: 'confirmed' });
    await validateTransfer(
      connection,
      sig.signature,
      { recipient: MERCHANT_WALLET, amount: new BigNumber(expectedLamports / LAMPORTS_PER_SOL) },
      { commitment: 'confirmed' }
    );
    return { verified: true, signature: sig.signature };
  } catch {
    return { verified: false, signature: null };
  }
}
