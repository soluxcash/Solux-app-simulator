
import { CollateralAsset } from '../types';

export const calculateTotalCollateralValue = (assets: CollateralAsset[]): number => {
  return assets.reduce((total, asset) => total + (asset.amount * asset.price), 0);
};

export const calculateMaxCreditLimit = (assets: CollateralAsset[]): number => {
  return assets.reduce((total, asset) => total + (asset.amount * asset.price * asset.ltv), 0);
};

export const calculateHealthFactor = (totalLimit: number, creditUsed: number): number => {
  if (creditUsed === 0) return 100;
  // Simplified health factor where 1.0 is liquidation point
  // Here we return it as a percentage of remaining safety
  const factor = totalLimit / creditUsed;
  return Math.min(Math.max(factor, 0), 2.5); // Cap at 2.5 for visualization
};

export const getHealthStatus = (factor: number) => {
  if (factor > 1.5) return { label: 'Safe', color: 'text-green-400' };
  if (factor > 1.1) return { label: 'Risk', color: 'text-yellow-400' };
  return { label: 'Liquidation Imminent', color: 'text-red-500' };
};
