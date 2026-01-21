import React, { useState, useEffect } from 'react';
import solanaVaultService, { VaultState } from '../services/solanaVaultService';

interface SolanaWalletProps {
  onCreditLineUpdate?: (creditLineUsd: number) => void;
}

const SolanaWallet: React.FC<SolanaWalletProps> = ({ onCreditLineUpdate }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const solPrice = solanaVaultService.getSolPrice();

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (vaultState && onCreditLineUpdate) {
      const creditLineUsd = solanaVaultService.convertSolToUsd(vaultState.creditLine);
      onCreditLineUpdate(creditLineUsd);
    }
  }, [vaultState, onCreditLineUpdate]);

  const checkConnection = async () => {
    const provider = solanaVaultService.getProvider();
    if (provider && provider.isConnected && provider.publicKey) {
      const pubKey = provider.publicKey.toString();
      setPublicKey(pubKey);
      setIsConnected(true);
      await refreshVaultState(pubKey);
    }
  };

  const refreshVaultState = async (pubKey: string) => {
    const state = await solanaVaultService.getVaultState(pubKey);
    setVaultState(state);
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pubKey = await solanaVaultService.connect();
      if (pubKey) {
        setPublicKey(pubKey);
        setIsConnected(true);
        await refreshVaultState(pubKey);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await solanaVaultService.disconnect();
    setIsConnected(false);
    setPublicKey(null);
    setVaultState(null);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await solanaVaultService.deposit(amount);
    if (result.success) {
      setSuccess(`Successfully deposited ${amount} SOL`);
      setDepositAmount('');
      if (publicKey) await refreshVaultState(publicKey);
    } else {
      setError(result.error || 'Deposit failed');
    }
    setIsLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await solanaVaultService.withdraw(amount);
    if (result.success) {
      setSuccess(`Successfully withdrawn ${amount} SOL`);
      setWithdrawAmount('');
      if (publicKey) await refreshVaultState(publicKey);
    } else {
      setError(result.error || 'Withdrawal failed');
    }
    setIsLoading(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Solana Vault</h3>
            <p className="text-sm text-gray-400">Connect wallet to deposit collateral</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-4">
          Deposit SOL as collateral to unlock your credit line. 50% of your collateral value is available as credit.
        </p>

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <>
              <img src="https://phantom.app/img/phantom-icon-purple.svg" alt="Phantom" className="w-5 h-5" />
              Connect Phantom Wallet
            </>
          )}
        </button>

        {!solanaVaultService.isPhantomInstalled() && (
          <p className="text-yellow-400 text-xs mt-2 text-center">
            Phantom wallet not detected. Click to install.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Solana Vault</h3>
            <p className="text-sm text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {formatAddress(publicKey!)}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-gray-400 hover:text-white text-sm"
        >
          Disconnect
        </button>
      </div>

      {vaultState && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Wallet Balance</p>
              <p className="text-white text-xl font-bold">{vaultState.balance.toFixed(4)} SOL</p>
              <p className="text-gray-500 text-xs">${solanaVaultService.convertSolToUsd(vaultState.balance).toFixed(2)}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Deposited</p>
              <p className="text-purple-400 text-xl font-bold">{vaultState.depositedAmount.toFixed(4)} SOL</p>
              <p className="text-gray-500 text-xs">${solanaVaultService.convertSolToUsd(vaultState.depositedAmount).toFixed(2)}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Credit Line</p>
              <p className="text-green-400 text-xl font-bold">{vaultState.creditLine.toFixed(4)} SOL</p>
              <p className="text-gray-500 text-xs">${solanaVaultService.convertSolToUsd(vaultState.creditLine).toFixed(2)}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Available Credit</p>
              <p className="text-blue-400 text-xl font-bold">{vaultState.availableCredit.toFixed(4)} SOL</p>
              <p className="text-gray-500 text-xs">${solanaVaultService.convertSolToUsd(vaultState.availableCredit).toFixed(2)}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'deposit'
                  ? 'bg-purple-600 text-white'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-purple-600 text-white'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              Withdraw
            </button>
          </div>

          {activeTab === 'deposit' ? (
            <div>
              <div className="relative mb-4">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/30 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">SOL</span>
              </div>
              {depositAmount && (
                <p className="text-gray-400 text-sm mb-4">
                  ≈ ${(parseFloat(depositAmount || '0') * solPrice).toFixed(2)} USD | 
                  Credit: {(parseFloat(depositAmount || '0') * 0.5).toFixed(4)} SOL
                </p>
              )}
              <button
                onClick={handleDeposit}
                disabled={isLoading || !depositAmount}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Deposit SOL'}
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-4">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/30 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">SOL</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Max withdraw: {(vaultState.depositedAmount - vaultState.usedCredit * 2).toFixed(4)} SOL
              </p>
              <button
                onClick={handleWithdraw}
                disabled={isLoading || !withdrawAmount}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Withdraw SOL'}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs">
          SOL Price: ${solPrice} | Network: Devnet | Credit Ratio: 50%
        </p>
      </div>
    </div>
  );
};

export default SolanaWallet;
