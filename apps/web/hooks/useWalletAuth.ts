import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import bs58 from 'bs58';
import { loginWallet } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function useWalletAuth() {
  const { connection } = useConnection();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('shoujiki_token');
    if (token && connected) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [connected]);

  useEffect(() => {
    if (connected && publicKey) {
      const fetchBalance = async () => {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      };
      fetchBalance();
      const id = connection.onAccountChange(publicKey, (info) => {
        setBalance(info.lamports / LAMPORTS_PER_SOL);
      });
      return () => { connection.removeAccountChangeListener(id); };
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  const login = async () => {
    if (!publicKey || !signMessage) return;
    try {
      setLoading(true);
      const message = "Login to Shoujiki AgentOS";
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureStr = bs58.encode(signature);

      await loginWallet(publicKey.toBase58(), signatureStr, message);
      setIsAuthenticated(true);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('shoujiki_token');
    setIsAuthenticated(false);
    disconnect();
  };

  return { isAuthenticated, login, logout, loading, publicKey, connected, balance };
}
