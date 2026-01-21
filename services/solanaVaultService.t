import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_NETWORK = 'devnet';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

const VAULT_PROGRAM_ID = new PublicKey('So1uxVau1tProgram11111111111111111111111111');

export interface VaultState {
  isConnected: boolean;
  publicKey: string | null;
  balance: number;
  depositedAmount: number;
  creditLine: number;
  usedCredit: number;
  availableCredit: number;
}

export interface PhantomProvider {
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  on: (event: string, callback: (args: any) => void) => void;
  off: (event: string, callback: (args: any) => void) => void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

class SolanaVaultService {
  private connection: Connection;
  private provider: PhantomProvider | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  getProvider(): PhantomProvider | null {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      return window.solana;
    }
    return null;
  }

  isPhantomInstalled(): boolean {
    return this.getProvider() !== null;
  }

  async connect(): Promise<string | null> {
    const provider = this.getProvider();
    if (!provider) {
      window.open('https://phantom.app/', '_blank');
      return null;
    }

    try {
      const response = await provider.connect();
      this.provider = provider;
      return response.publicKey.toString();
    } catch (error) {
      console.error('Failed to connect to Phantom:', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    const provider = this.getProvider();
    if (provider) {
      await provider.disconnect();
      this.provider = null;
    }
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  async getVaultState(publicKey: string): Promise<VaultState> {
    const balance = await this.getBalance(publicKey);
    
    const storedState = localStorage.getItem(`vault_state_${publicKey}`);
    let depositedAmount = 0;
    let usedCredit = 0;
    
    if (storedState) {
      const parsed = JSON.parse(storedState);
      depositedAmount = parsed.depositedAmount || 0;
      usedCredit = parsed.usedCredit || 0;
    }

    const creditLine = depositedAmount * 0.5;
    const availableCredit = creditLine - usedCredit;

    return {
      isConnected: true,
      publicKey,
      balance,
      depositedAmount,
      creditLine,
      usedCredit,
      availableCredit,
    };
  }

  async deposit(amount: number): Promise<{ success: boolean; signature?: string; error?: string }> {
    const provider = this.getProvider();
    if (!provider || !provider.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      const vaultPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_tokens')],
        VAULT_PROGRAM_ID
      )[0];

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: vaultPDA,
          lamports,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = provider.publicKey;

      const signed = await provider.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());
      await this.connection.confirmTransaction(signature, 'confirmed');

      const publicKey = provider.publicKey.toString();
      const storedState = localStorage.getItem(`vault_state_${publicKey}`);
      let state = storedState ? JSON.parse(storedState) : { depositedAmount: 0, usedCredit: 0 };
      state.depositedAmount += amount;
      localStorage.setItem(`vault_state_${publicKey}`, JSON.stringify(state));

      return { success: true, signature };
    } catch (error: any) {
      console.error('Deposit failed:', error);
      return { success: false, error: error.message || 'Deposit failed' };
    }
  }

  async withdraw(amount: number): Promise<{ success: boolean; signature?: string; error?: string }> {
    const provider = this.getProvider();
    if (!provider || !provider.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const publicKey = provider.publicKey.toString();
      const storedState = localStorage.getItem(`vault_state_${publicKey}`);
      let state = storedState ? JSON.parse(storedState) : { depositedAmount: 0, usedCredit: 0 };
      
      const minCollateral = state.usedCredit * 2;
      const maxWithdraw = state.depositedAmount - minCollateral;
      
      if (amount > maxWithdraw) {
        return { success: false, error: `Maximum withdrawal: ${maxWithdraw.toFixed(4)} SOL (maintaining collateral for used credit)` };
      }

      state.depositedAmount -= amount;
      localStorage.setItem(`vault_state_${publicKey}`, JSON.stringify(state));

      return { success: true, signature: 'simulated_withdrawal' };
    } catch (error: any) {
      console.error('Withdraw failed:', error);
      return { success: false, error: error.message || 'Withdrawal failed' };
    }
  }

  async useCredit(amount: number): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider();
    if (!provider || !provider.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const publicKey = provider.publicKey.toString();
      const storedState = localStorage.getItem(`vault_state_${publicKey}`);
      let state = storedState ? JSON.parse(storedState) : { depositedAmount: 0, usedCredit: 0 };
      
      const creditLine = state.depositedAmount * 0.5;
      const availableCredit = creditLine - state.usedCredit;
      
      if (amount > availableCredit) {
        return { success: false, error: `Insufficient credit. Available: ${availableCredit.toFixed(4)} SOL` };
      }

      state.usedCredit += amount;
      localStorage.setItem(`vault_state_${publicKey}`, JSON.stringify(state));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async repayCredit(amount: number): Promise<{ success: boolean; error?: string }> {
    const provider = this.getProvider();
    if (!provider || !provider.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const publicKey = provider.publicKey.toString();
      const storedState = localStorage.getItem(`vault_state_${publicKey}`);
      let state = storedState ? JSON.parse(storedState) : { depositedAmount: 0, usedCredit: 0 };
      
      if (amount > state.usedCredit) {
        return { success: false, error: `Repayment exceeds debt. Current debt: ${state.usedCredit.toFixed(4)} SOL` };
      }

      state.usedCredit -= amount;
      localStorage.setItem(`vault_state_${publicKey}`, JSON.stringify(state));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  getSolPrice(): number {
    return 150;
  }

  convertSolToUsd(sol: number): number {
    return sol * this.getSolPrice();
  }

  convertUsdToSol(usd: number): number {
    return usd / this.getSolPrice();
  }
}

export const solanaVaultService = new SolanaVaultService();
export default solanaVaultService;
