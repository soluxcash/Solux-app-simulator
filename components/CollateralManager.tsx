
import React, { useState } from 'react';
import { AssetType, CollateralAsset } from '../types';
import { ASSET_ICONS, MOCK_MARKET_PRICES } from '../constants';

interface CollateralManagerProps {
  assets: CollateralAsset[];
  onDeposit: (type: AssetType, amount: number) => void;
  isLoading?: boolean;
}

export const CollateralManager: React.FC<CollateralManagerProps> = ({ assets, onDeposit, isLoading = false }) => {
  const [selectedAsset, setSelectedAsset] = useState<AssetType>(AssetType.ETH);
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    onDeposit(selectedAsset, Number(amount));
    setAmount('');
  };

  const SkeletonRow = () => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-transparent animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
        <div className="space-y-2">
          <div className="h-2 w-12 bg-gray-200 rounded"></div>
          <div className="h-1.5 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="space-y-2 flex flex-col items-end">
        <div className="h-2 w-16 bg-gray-200 rounded"></div>
        <div className="h-1.5 w-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="glass p-8 rounded-xl border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold">Asset Management</h3>
          <p className="text-xs text-gray-400">Manage your crypto collateral vault</p>
        </div>
        <div className="px-3 py-1 bg-black text-white text-[9px] font-bold rounded uppercase tracking-widest">
          Active Vault
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Current Holdings</h4>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              assets.map((asset) => (
                <div key={asset.type} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black border border-gray-100">
                      <i className={ASSET_ICONS[asset.type]}></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold">{asset.type}</p>
                      <p className="text-[9px] text-gray-400">LTV {asset.ltv * 100}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-black">{asset.amount.toFixed(4)}</p>
                    <p className="text-[9px] text-gray-400 font-medium">${(asset.amount * asset.price).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Deposit Collateral</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {MOCK_MARKET_PRICES.map((m) => (
                <button
                  key={m.asset}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSelectedAsset(m.asset)}
                  className={`py-3 rounded-lg border transition-all text-[10px] font-bold flex flex-col items-center gap-1
                    ${selectedAsset === m.asset ? 'border-black bg-black text-white shadow-md' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <i className={ASSET_ICONS[m.asset]}></i>
                  {m.asset}
                </button>
              ))}
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Input Amount</label>
              <input 
                type="text"
                disabled={isLoading}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 outline-none focus:border-black transition-all text-sm font-bold disabled:opacity-50"
              />
              <button 
                type="button"
                disabled={isLoading}
                className="absolute right-3 bottom-3 text-[10px] font-bold text-gray-400 hover:text-black disabled:opacity-50"
              >
                MAX
              </button>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !amount}
              className={`w-full py-4 bg-black hover:bg-gray-900 text-white rounded-lg font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-black/10 flex justify-center items-center gap-2
                ${(isLoading || !amount) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && <i className="fa-solid fa-circle-notch animate-spin text-white"></i>}
              {isLoading ? 'Processing...' : 'Confirm Deposit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
