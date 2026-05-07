"use client";

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BadgeCheck, Shield, Cpu, Activity, ArrowUpRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatSol } from '@/lib/utils';
import Link from 'next/link';

interface AgentCardProps {
  agent: any;
}

export const AgentCard = ({ agent }: AgentCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col group overflow-hidden border-white/5 bg-white/[0.03] hover:border-cyber-cyan/40 hover:bg-white/[0.05] transition-all duration-500">
        <CardHeader className="relative pb-0 border-b-0 bg-transparent px-8 pt-8">
          <div className="flex justify-between items-start mb-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-blue/20 border border-white/10 flex items-center justify-center text-cyber-cyan group-hover:border-cyber-cyan/50 transition-colors">
                <Cpu size={28} />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                <Shield size={10} className="text-cyber-cyan" />
                VACN_Verified
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase italic group-hover:text-cyber-cyan transition-colors">{agent.name}</h3>
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{agent.id}</p>
          </div>
        </CardHeader>

        <CardContent className="flex-1 px-8 pt-6 pb-8 space-y-8 flex flex-col">
          <p className="text-zinc-400 text-xs font-medium leading-relaxed line-clamp-3">
            {agent.description || "No description provided for this neural entity. Autonomous capabilities range from SVM transaction auditing to cross-chain liquidity routing."}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
              <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Compute_Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-bold text-white">{agent.price_per_million_input_tokens}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase">SOL/M</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors">
              <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Successful_Runs</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-bold text-cyber-cyan">{agent.successful_runs || 0}</span>
                <Zap size={10} className="text-cyber-cyan ml-1" />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-3">
            <Link href={`/agent/${agent.id}`} className="flex-1">
              <Button variant="neon" className="w-full h-11 text-[10px] shadow-lg shadow-cyber-cyan/5">
                Initialize_Link
                <ArrowUpRight size={14} />
              </Button>
            </Link>
            <button className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all">
              <Activity size={16} />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
