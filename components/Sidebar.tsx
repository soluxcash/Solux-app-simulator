
import React from 'react';

interface SidebarProps {
  walletAddress: string | null;
  userName: string;
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ walletAddress, userName, activeView, onViewChange }) => {
  const logoUrl = "/logo-sidebar.png";

  const menuItems = [
    { icon: 'fa-house', label: 'Overview' },
    { icon: 'fa-vault', label: 'Assets' },
    { icon: 'fa-credit-card', label: 'Credit Card' },
    { icon: 'fa-clock-rotate-left', label: 'History' },
    { icon: 'fa-shield-halved', label: 'Security' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-full border-r border-gray-100 p-6 bg-white shrink-0">
      <div className="flex items-center gap-3 mb-12 cursor-pointer" onClick={() => onViewChange('Overview')}>
        <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-transform hover:scale-105">
          <img 
            src={logoUrl} 
            alt="Solux Logo" 
            className="w-full h-full p-1 object-contain"
            crossOrigin="anonymous"
            loading="eager"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tighter uppercase text-black leading-none">SOLUX</span>
          <span className="text-[7px] text-blue-500 font-bold tracking-[0.2em] mt-1">SANDBOX</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-4 ml-4">Main Menu</p>
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onViewChange(item.label)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm font-semibold
              ${activeView === item.label ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
          >
            <i className={`fa-solid ${item.icon} w-5`}></i>
            {item.label}
          </button>
        ))}
      </nav>

      
      <button 
        onClick={() => onViewChange('Profile')}
        className={`mt-6 flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left w-full
          ${activeView === 'Profile' ? 'bg-black border-black shadow-lg' : 'bg-white border-gray-100 hover:border-black hover:shadow-md'}`}
      >
         <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border shrink-0
           ${activeView === 'Profile' ? 'bg-white/10 border-white/20' : 'bg-gray-200 border-gray-100'}`}>
           <i className={`fa-solid fa-user text-xs ${activeView === 'Profile' ? 'text-white' : 'text-gray-400'}`}></i>
         </div>
         <div className="flex-1 overflow-hidden">
           <p className={`text-[11px] font-bold truncate ${activeView === 'Profile' ? 'text-white' : 'text-black'}`}>
            {userName || 'User'}
           </p>
           <p className={`text-[9px] font-medium ${activeView === 'Profile' ? 'text-white/60' : 'text-gray-400'}`}>
            Sandbox Admin
           </p>
         </div>
      </button>
    </aside>
  );
};
