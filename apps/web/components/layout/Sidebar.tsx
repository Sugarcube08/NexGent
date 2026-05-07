"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, Code2, Layers, Activity, 
  LayoutGrid, Landmark, ShieldAlert, FileSearch,
  Cpu, Zap, Menu, X, ChevronRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const navItems = [
  { label: 'Fleet Overview', href: '/my-agents', icon: LayoutGrid },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { label: 'Swarm Builder', href: '/swarms', icon: Layers },
  { label: 'Protocol Bench', href: '/dev', icon: Code2 },
  { label: 'Treasury', href: '/wallet', icon: Landmark },
  { label: 'Proof Explorer', href: '/explorer', icon: FileSearch },
  { label: 'Dispute Portal', href: '/disputes', icon: ShieldAlert },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [stats, setStats] = useState({ active_agents: 0, total_executions: 0, total_volume: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      className="relative z-50 h-screen sticky top-0 hidden md:flex flex-col bg-cyber-background border-r border-white/5 transition-all duration-500 ease-in-out px-4 py-8"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="relative w-8 h-8 rounded-lg bg-cyber-cyan shadow-neon-cyan flex items-center justify-center shrink-0">
          <Zap size={16} className="text-black fill-black" />
          <div className="absolute -inset-1 bg-cyber-cyan/20 blur-sm rounded-lg -z-10 animate-pulse-slow" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-black tracking-tighter text-white uppercase italic"
            >
              Shoujiki<span className="text-cyber-cyan">.ai</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative",
                  isActive 
                    ? "bg-cyber-cyan/10 text-cyber-cyan" 
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-y-2 left-0 w-1 bg-cyber-cyan rounded-full shadow-neon-cyan"
                  />
                )}
                <Icon size={18} className={cn(isActive ? "text-cyber-cyan" : "group-hover:text-white")} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isCollapsed && isActive && (
                  <ChevronRight size={14} className="ml-auto opacity-50" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Stats Panel */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-auto p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4"
          >
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <Sparkles size={12} className="text-cyber-cyan" />
              Fleet_Telemetrics
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-600 uppercase">Live_Nodes</p>
                <p className="text-sm font-mono font-black text-white">{stats.active_agents}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-bold text-zinc-600 uppercase">Throughput</p>
                <p className="text-sm font-mono font-black text-cyber-cyan">{stats.total_executions}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-cyber-cyan shadow-neon-cyan"
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-cyber-background border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-cyber-cyan transition-all"
      >
        <Menu size={12} className={cn("transition-transform", isCollapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
};
