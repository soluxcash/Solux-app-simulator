
import React, { useState } from 'react';
import { LithicCardDetails } from '../types';

interface CreditCardProps {
  balance: number;
  limit: number;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  cardDetails?: LithicCardDetails;
}

export const CreditCard: React.FC<CreditCardProps> = ({ balance, limit, isFrozen, onToggleFreeze, cardDetails }) => {
  const [showDetails, setShowDetails] = useState(false);
  const logoUrl = "/logo.png";

  const formatPan = (pan: string) => {
    if (!pan) return '•••• •••• •••• ••••';
    return pan.replace(/(.{4})/g, '$1 ').trim();
  };

  const maskedPan = cardDetails?.pan 
    ? `•••• •••• •••• ${cardDetails.last_four}` 
    : '•••• •••• •••• ••••';
  
  const fullPan = cardDetails?.pan ? formatPan(cardDetails.pan) : '•••• •••• •••• ••••';
  const expiry = cardDetails ? `${cardDetails.exp_month} / ${cardDetails.exp_year.slice(-2)}` : '-- / --';
  const cvv = cardDetails?.cvv || '---';
  const spendLimit = cardDetails?.spend_limit || 0;

  return (
    <div className="flex flex-col gap-6 select-none">
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className={`relative w-full aspect-[1.586/1] rounded-[22px] p-8 cursor-pointer transition-all duration-700 overflow-hidden group
          ${isFrozen ? 'grayscale-[0.5] opacity-80' : 'hover:scale-[1.03] active:scale-95'}
          bg-gradient-to-br from-[#ffffff] via-[#fcfdfe] to-[#f1f5f9] border border-[#e2e8f0]`}
        style={{
          boxShadow: isFrozen 
            ? '0 10px 20px -5px rgba(0, 0, 0, 0.1)' 
            : '0 30px 60px -12px rgba(0, 0, 0, 0.15), 0 18px 36px -18px rgba(0, 0, 0, 0.2), inset 0 0 1px 1px rgba(255, 255, 255, 0.9)'
        }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
           <span className="bg-black/5 text-[8px] font-black px-3 py-1 rounded-full text-black/40 uppercase tracking-[0.3em] backdrop-blur-sm border border-black/5">
             {cardDetails ? 'Live Sandbox' : 'No Card'}
           </span>
        </div>

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
             style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, #000 1px, #000 2px)' }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-14 h-11 bg-gradient-to-br from-[#cbd5e1] via-[#f8fafc] to-[#94a3b8] rounded-lg relative overflow-hidden border border-black/5 shadow-sm">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-black/10"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-black/10"></div>
              <div className="absolute inset-2 border-[0.5px] border-black/5 rounded-sm"></div>
              <div className="absolute inset-3 border-[0.5px] border-black/5 rounded-sm"></div>
            </div>

            <div className="text-right">
               <div className="flex items-center gap-2 justify-end">
                 <img 
                    src={logoUrl} 
                    alt="Solux" 
                    className="h-8 w-auto object-contain transition-transform group-hover:scale-110 duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                 />
                 <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">SOLUX</span>
               </div>
               <span className="text-[7px] uppercase tracking-[0.4em] text-slate-400 font-bold block mt-1">VIRTUAL CARD</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <p className="text-2xl font-mono tracking-[0.25em] text-slate-800 drop-shadow-sm">
                {showDetails ? fullPan : maskedPan}
              </p>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex gap-10">
                <div className="space-y-0.5">
                  <p className="text-[6px] uppercase font-black text-slate-400 tracking-widest">VALID THRU</p>
                  <p className="text-sm font-bold text-slate-700 tracking-widest">{expiry}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[6px] uppercase font-black text-slate-400 tracking-widest">CVV</p>
                  <p className="text-sm font-bold text-slate-700 tracking-widest">{showDetails ? cvv : '•••'}</p>
                </div>
              </div>
              
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 border border-slate-200 shadow-inner overflow-hidden relative">
                <div className="absolute inset-0 opacity-30 mix-blend-overlay animate-pulse bg-gradient-to-tr from-cyan-400 via-purple-400 to-pink-400"></div>
                <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-white/60 to-transparent rotate-[30deg] animate-infinite-slide"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border border-gray-100 p-4 rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cardDetails ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'} animate-pulse`}></div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 block leading-none">
              {cardDetails ? `Limit: $${(spendLimit / 100).toLocaleString()}` : 'No Card Linked'}
            </span>
            <span className="text-[8px] text-slate-400 font-bold tracking-tight uppercase">
              {cardDetails ? `Used: $${balance.toFixed(2)}` : 'Complete enrollment'}
            </span>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleFreeze();
          }}
          disabled={!cardDetails}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-[0.1em] transition-all uppercase border
            ${!cardDetails ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' :
              isFrozen ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100 hover:text-black hover:border-black'}`}
        >
          {isFrozen ? 'UNFREEZE' : 'FREEZE'}
        </button>
      </div>
    </div>
  );
};
