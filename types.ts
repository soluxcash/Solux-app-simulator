
export enum AssetType {
  ETH = 'ETH',
  USDC = 'USDC',
  SOL = 'SOL',
  WBTC = 'WBTC'
}

export interface CollateralAsset {
  type: AssetType;
  amount: number;
  price: number;
  ltv: number; 
}

// Added missing MarketPrice interface used in constants.ts
export interface MarketPrice {
  asset: AssetType;
  price: number;
  change24h: number;
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  spendingLimit: number | null;
  ipWhitelist: string[];
  auditLogs: { action: string; timestamp: number }[];
}

export interface LithicCardDetails {
  token: string;
  pan: string;
  cvv: string;
  exp_month: string;
  exp_year: string;
  last_four: string;
  spend_limit: number;
  state: string;
}

export interface UserState {
  walletAddress: string | null;
  collateral: CollateralAsset[];
  creditUsed: number;
  totalLimit: number;
  transactions: Transaction[];
  isCardFrozen: boolean;
  security: SecuritySettings;
  lithicAccountToken?: string;
  lithicCardToken?: string;
  lithicCardDetails?: LithicCardDetails;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'DECLINED';
  category: string;
}

export interface ApiLog {
  id: string;
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT';
  status: number;
  timestamp: number;
  payload: any;
  response: any;
}

// Lithic Specific Interfaces
export interface LithicEnrollment {
  first_name: string;
  last_name: string;
  email: string;
  dob: string;
  address: {
    address1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  ssn_last_four: string;
}
