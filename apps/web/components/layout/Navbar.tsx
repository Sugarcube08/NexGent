"use client";

import React from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Wallet, Bell, Search, Hexagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { truncateWallet } from '@/lib/utils';

export const Navbar = () => {
  const { connected, login, publicKey, isAuthenticated } = useWalletAuth();

  return (
    <motion.nav 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 w-full px-12 py-8 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />
            <span className="text-xs font-semibold text-zinc-300 tracking-tight uppercase">SVM_Network_Online</span>
          </div>
        </div>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-12">
          <div className="w-full relative group">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search registry..."
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl h-11 pl-12 pr-4 text-sm font-medium text-zinc-300 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.05] transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all shadow-sm">
            <Bell size={18} />
          </button>
          
          {connected ? (
            isAuthenticated ? (
              <div className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer group shadow-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Operator</span>
                  <span className="text-xs font-semibold text-zinc-100 font-mono">{truncateWallet(publicKey?.toString() || '')}</span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center shadow-lg group-hover:bg-zinc-200 transition-colors">
                  <Wallet size={16} />
                </div>
              </div>
            ) : (
              <Button variant="primary" size="md" onClick={login} className="h-11 shadow-xl">
                Authorize_Session
              </Button>
            )
          ) : (
            <Button variant="primary" size="md" onClick={login} className="h-11 shadow-xl">
              Connect_Node
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};
