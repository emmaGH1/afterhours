export interface VerifiedPool {
  poolAddress: string;
  poolAuthority: string;
  programId: string;
  mints: {
    usdcTest: { address: string; decimals: number };
    aaplxTest: { address: string; decimals: number };
    pool: { address: string; decimals: number };
  };
  reserveAccounts: { usdcTest: string; aaplxTest: string };
  feeAccount: string;
  poolPrice: number;
  poolFeeBps: number;
  reserves: { usdc: number; aaplx: number };
  proof: { signature: string; explorerUrl: string };
}
