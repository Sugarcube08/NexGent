"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, Code2, Layers, 
  LayoutGrid, Landmark, ShieldAlert, FileSearch,
  Zap, Menu, ChevronRight, Sparkles
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
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="relative z-50 h-screen sticky top-0 hidden md:flex flex-col bg-background border-r border-white/[0.05] transition-all duration-300 px-4 py-8"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 mb-10">
        <div className="relative w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xl">
          <Zap size={18} className="text-black fill-black" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-bold tracking-tight text-white"
            >
              Shoujiki<span className="text-zinc-500">.ai</span>
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
                whileHover={{ x: 2 }}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-white/[0.06] text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                )}
              >
                <Icon size={18} className={cn(isActive ? "text-cyber-cyan" : "group-hover:text-zinc-300")} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium tracking-tight whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!isCollapsed && isActive && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-cyber-cyan shadow-[0_0_8px_rgba(0,243,255,0.5)]" />
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-auto p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Sparkles size={12} className="text-cyber-cyan" />
              Telemetrics
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-zinc-600 uppercase">Nodes</p>
                <p className="text-sm font-semibold text-white">{stats.active_agents}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-bold text-zinc-600 uppercase">Tasks</p>
                <p className="text-sm font-semibold text-cyber-cyan">{stats.total_executions}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-cyber-cyan shadow-soft-glow"
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-background border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all shadow-xl"
      >
        <Menu size={10} className={cn("transition-transform", isCollapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
};
