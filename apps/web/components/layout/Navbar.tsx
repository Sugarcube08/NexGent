"use client";

import React from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Wallet, Bell, Search, Hexagon, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { truncateWallet } from '@/lib/utils';

export const Navbar = () => {
  const { connected, login, publicKey } = useWalletAuth();

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 w-full px-8 py-6 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Breadcrumbs / Context */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan to-cyber-blue flex items-center justify-center shadow-neon-cyan/20">
            <Hexagon size={20} className="text-black fill-black" />
          </div>
          <div className="hidden sm:block">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Network_Status</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Mainnet_Beta_Alpha</span>
            </div>
          </div>
        </div>

        {/* Floating Search (Aesthetic) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-12">
          <div className="w-full relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyber-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="Search Agents, Tasks, Protocols..."
              className="w-full bg-white/5 border border-white/10 rounded-xl h-10 pl-11 pr-4 text-xs font-medium text-zinc-300 focus:outline-none focus:border-cyber-cyan/30 focus:bg-white/[0.08] transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all">
            <Bell size={18} />
          </button>
          
          {connected ? (
            <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group cursor-pointer">
              <div className="flex flex-col items-end px-2">
                <span className="text-[9px] font-black text-zinc-500 uppercase">Operator</span>
                <span className="text-[10px] font-mono font-bold text-zinc-100">{truncateWallet(publicKey?.toString() || '')}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 flex items-center justify-center text-cyber-cyan">
                <Wallet size={16} />
              </div>
            </div>
          ) : (
            <Button variant="neon" size="sm" onClick={login} className="h-10 rounded-xl px-6">
              Connect_Node
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};
