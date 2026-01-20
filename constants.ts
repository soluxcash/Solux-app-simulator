
import { AssetType, CollateralAsset, MarketPrice } from './types';

export const INITIAL_COLLATERAL: CollateralAsset[] = [
  { type: AssetType.ETH, amount: 2.5, price: 3200, ltv: 0.7 },
  { type: AssetType.USDC, amount: 5000, price: 1, ltv: 0.8 },
];

export const MOCK_MARKET_PRICES: MarketPrice[] = [
  { asset: AssetType.ETH, price: 3245.50, change24h: 2.4 },
  { asset: AssetType.USDC, price: 1.00, change24h: 0.01 },
  { asset: AssetType.SOL, price: 145.20, change24h: -1.2 },
  { asset: AssetType.WBTC, price: 65200.00, change24h: 0.8 },
];

export const ASSET_ICONS: Record<AssetType, string> = {
  [AssetType.ETH]: 'fa-brands fa-ethereum',
  [AssetType.USDC]: 'fa-solid fa-dollar-sign',
  [AssetType.SOL]: 'fa-solid fa-sun',
  [AssetType.WBTC]: 'fa-brands fa-bitcoin',
};
