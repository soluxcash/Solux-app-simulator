
import React from 'react';
import { getHealthStatus } from '../services/collateralService';

interface StatsProps {
  totalCollateral: number;
  creditUsed: number;
  maxLimit: number;
  healthFactor: number;
}

export const StatsGrid: React.FC<StatsProps> = ({ totalCollateral, creditUsed, maxLimit, healthFactor }) => {
  const healthStatus = getHealthStatus(healthFactor);
  
  const stats = [
    {
      label: 'Total Collateral',
      value: `$${totalCollateral.toLocaleString()}`,
      sub: 'Verified On-chain',
      icon: 'fa-shield',
      color: 'text-black'
    },
    {
      label: 'Spending Power',
      value: `$${(maxLimit - creditUsed).toLocaleString()}`,
      sub: `Available of $${maxLimit.toLocaleString()}`,
      icon: 'fa-arrow-trend-up',
      color: 'text-black'
    },
    {
      label: 'Risk Factor',
      value: healthFactor.toFixed(2),
      sub: healthStatus.label,
      icon: 'fa-heart-pulse',
      color: healthStatus.color === 'text-red-500' ? 'text-red-600' : 'text-black'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className="glass p-6 rounded-xl border border-gray-100 hover:border-black transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 ${stat.color} group-hover:bg-black group-hover:text-white transition-colors`}>
              <i className={`fa-solid ${stat.icon} text-sm`}></i>
            </div>
          </div>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
          <h3 className="text-2xl font-bold mt-1 tracking-tight text-black">{stat.value}</h3>
          <p className={`text-[10px] mt-2 font-semibold uppercase ${stat.color === 'text-red-600' ? 'text-red-600' : 'text-gray-400'}`}>
            {stat.sub}
          </p>
        </div>
      ))}
    </div>
  );
};
