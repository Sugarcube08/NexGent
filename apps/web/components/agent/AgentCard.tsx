"use client";

import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Play, User, Trash2, BadgeCheck, CreditCard, Wallet, Cpu, Activity, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_wallet: string;
    mint_address?: string;
    risk_score?: number;
    reputation_score?: number;
    reliability_score?: number;
    balance?: number;
    trust_level?: string;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const AgentCard = ({ agent, onDelete, isDeleting, onWithdraw, isWithdrawing }: AgentCardProps) => {
  const truncatedWallet = `${agent.creator_wallet.slice(0, 4)}...${agent.creator_wallet.slice(-4)}`;

  const getTrustColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'elite': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'trusted': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
  };

  return (
    <Card className="group relative bg-zinc-900/60 border-zinc-800 hover:border-blue-500/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden rounded-[24px]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] group-hover:bg-blue-600/10 transition-colors" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/5 blur-[60px] group-hover:bg-purple-600/10 transition-colors" />
      
      <CardHeader className="space-y-4 relative z-10 text-left items-start pb-2">
        <div className="flex justify-between items-start w-full">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-inner">
                <Cpu size={18} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors leading-none tracking-tight">
                {agent.name}
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {agent.mint_address && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <BadgeCheck size={10} className="text-blue-400" />
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Asset</span>
                </div>
              )}
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 border rounded-full", getTrustColor(agent.trust_level))}>
                <Shield size={10} />
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {agent.trust_level || "Verified"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-full">
                <Activity size={10} className="text-zinc-400" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                   Rep: {agent.reputation_score?.toFixed(0) || "100"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Pricing</div>
            <span className="text-lg font-black text-white bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-800 group-hover:border-blue-500/30 transition-colors">
              {agent.price} <span className="text-blue-500">SOL</span>
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-4 text-left">
        <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 font-medium min-h-[4.5rem]">
          {agent.description || "Autonomous agent specialized in high-frequency execution and on-chain coordination."}
        </p>
        
        <div className="mt-4 flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
            <User size={12} className="text-zinc-600" />
            <span>Creator: <span className="text-zinc-300 font-mono">{truncatedWallet}</span></span>
          </div>
          {agent.balance !== undefined && agent.balance > 0 && (
            <div className="flex items-center gap-1.5 text-yellow-500/80">
              <Wallet size={12} />
              <span className="text-[10px] font-black uppercase">{agent.balance.toFixed(2)} SOL</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 relative z-10 pt-2 pb-6">
        <div className="flex gap-3 w-full">
          {agent.id ? (
            <Link href={`/agent/${agent.id}`} className="flex-1">
              <Button 
                className="w-full gap-2 font-black py-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.1)] hover:shadow-[0_0_25px_rgba(37,99,235,0.3)] bg-blue-600 border-t border-blue-400/30 hover:scale-[1.02] active:scale-[0.98]" 
              >
                <Play size={16} fill="currentColor" className="ml-1" />
                INITIALIZE
              </Button>
            </Link>
          ) : (
            <Button 
              className="flex-1 gap-2 opacity-50 cursor-not-allowed py-6 rounded-2xl" 
              variant="secondary"
              disabled
            >
              INVALID
            </Button>
          )}

          {onWithdraw && agent.balance !== undefined && agent.balance > 0 && (
            <Button
              className="flex-shrink-0 w-14 h-14 p-0 rounded-2xl bg-zinc-950 hover:bg-green-500/10 text-zinc-400 hover:text-green-500 border border-zinc-800 hover:border-green-500/30 transition-all"
              onClick={onWithdraw}
              isLoading={isWithdrawing}
              title="Withdraw Balance"
            >
              <CreditCard size={20} />
            </Button>
          )}
        </div>

        {onDelete && (
          <button
            className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 hover:text-red-500 transition-colors"
            onClick={onDelete}
          >
            [ Terminate Agent Instance ]
          </button>
        )}
      </CardFooter>
    </Card>
  );
};
