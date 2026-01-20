
import React from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, isLoading = false }) => {
  const SkeletonTx = () => (
    <div className="flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-100"></div>
        <div className="space-y-2">
          <div className="h-2.5 w-24 bg-gray-100 rounded"></div>
          <div className="h-2 w-16 bg-gray-100 rounded"></div>
        </div>
      </div>
      <div className="space-y-2 flex flex-col items-end">
        <div className="h-2.5 w-12 bg-gray-100 rounded"></div>
        <div className="h-2 w-8 bg-gray-100 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="glass p-6 rounded-xl border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Activity</h3>
        <button className="text-[10px] font-bold text-gray-400 hover:text-black transition-all">Export CSV</button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <>
            <SkeletonTx />
            <SkeletonTx />
            <SkeletonTx />
            <SkeletonTx />
          </>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs font-medium italic">
            No history available.
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-black border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
                  <i className={`fa-solid ${getIconForCategory(tx.category)} text-xs`}></i>
                </div>
                <div>
                  <p className="text-xs font-bold text-black">{tx.merchant}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(tx.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-black">-${tx.amount.toFixed(2)}</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase">Success</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const getIconForCategory = (cat: string) => {
  switch (cat.toLowerCase()) {
    case 'food': return 'fa-utensils';
    case 'shopping': return 'fa-cart-shopping';
    case 'travel': return 'fa-route';
    default: return 'fa-credit-card';
  }
};
