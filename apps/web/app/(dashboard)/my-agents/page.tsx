"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents, deleteAgent } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, LayoutGrid, Shield, Activity, Sparkles, Cpu, Wallet, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MyAgentsPage() {
  const router = useRouter();
  const { connected, login } = useWalletAuth();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAgents = async () => {
    try {
      const data = await getMyAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) fetchAgents();
    else setLoading(false);
  }, [connected]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <Loader2 className="animate-spin text-zinc-500" size={32} strokeWidth={1.5} />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accessing Fleet...</span>
    </div>
  );

  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-40 gap-10 animate-fade-in">
      <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-zinc-700 relative shadow-2xl">
        <Shield size={44} strokeWidth={1} />
        <div className="absolute inset-0 blur-3xl bg-cyber-cyan/5 -z-10" />
      </div>
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-white tracking-tight">Operator Authentication Required</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto font-medium">Link your sovereign wallet to manage and monitor your provisioned autonomous entities.</p>
      </div>
      <Button variant="primary" onClick={login} className="px-12 h-14 rounded-2xl shadow-2xl">Initialize Connection</Button>
    </div>
  );

  return (
    <div className="space-y-16 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 pb-12 border-b border-white/[0.06]">
        <div className="space-y-5">
           <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />
            Control_Panel_Active
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">Agent <span className="text-zinc-500">Fleet</span></h1>
          <p className="text-zinc-500 text-base font-medium max-w-2xl leading-relaxed">
            Manage your fleet of autonomous neural entities. Review execution receipts, adjust throughput rates, and monitor on-chain settlements.
          </p>
        </div>
        <Button onClick={() => router.push('/dev')} className="h-14 px-10 rounded-2xl gap-3 shadow-2xl group transition-all duration-300">
          <Rocket size={20} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          Deploy New Entity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Live Nodes', value: agents.length, icon: Cpu, color: 'text-white' },
          { label: 'Total Earnings', value: agents.reduce((acc, a) => acc + (a.total_earnings || 0), 0).toFixed(4), unit: 'SOL', icon: Wallet, color: 'text-green-500' },
          { label: 'Network Uptime', value: '99.9', unit: '%', icon: Activity, color: 'text-cyber-cyan' },
          { label: 'Compute Load', value: '14.2', unit: 'PFLOPS', icon: Sparkles, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.02] border border-white/[0.06] shadow-inner", stat.color)}>
                <stat.icon size={22} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight font-mono">{stat.value}</span>
              {stat.unit && <span className="text-[11px] font-bold text-zinc-600 uppercase">{stat.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.4 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center space-y-8 border border-dashed border-white/[0.08] rounded-[48px] bg-white/[0.01]">
          <div className="w-24 h-24 bg-white/[0.02] border border-white/[0.06] rounded-[2.5rem] flex items-center justify-center text-zinc-700 mx-auto relative overflow-hidden group shadow-2xl">
            <LayoutGrid size={44} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white tracking-tight">Fleet Registry Empty</h3>
            <p className="text-zinc-500 text-base font-medium max-w-sm mx-auto">Your private fleet registry is currently empty. Provision your first autonomous entity in the Protocol Studio.</p>
          </div>
          <Button variant="primary" onClick={() => router.push('/dev')} className="h-14 px-12 rounded-2xl shadow-2xl">Initialize Provisioning</Button>
        </div>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
