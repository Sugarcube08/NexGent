"use client";

import React, { useEffect, useState } from 'react';
import { getMyAgents, deleteAgent, withdrawAgentBalance } from '@/lib/api';
import { AgentCard } from '@/components/agent/AgentCard';
import { Loader2, Plus, LayoutGrid, Terminal as TerminalIcon, Shield, Activity, Sparkles, Cpu, Wallet, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MyAgentsPage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Permanent de-provisioning of this neural entity? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteAgent(id);
      await fetchAgents();
      setSuccess('Entity purged from registry.');
    } catch (err) {
      setError('Purge sequence failed.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <Loader2 className="animate-spin text-cyber-cyan" size={32} />
        <div className="absolute inset-0 blur-md bg-cyber-cyan/20 animate-pulse" />
      </div>
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Querying_Private_Fleet...</span>
    </div>
  );

  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8 animate-in fade-in duration-1000">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-700 relative">
        <Shield size={40} />
        <div className="absolute inset-0 blur-2xl bg-cyber-cyan/5 -z-10" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Access_Restricted</h2>
        <p className="text-zinc-500 text-sm max-w-xs mx-auto font-medium">Link your sovereign identity to manage your autonomous fleet.</p>
      </div>
      <Button variant="neon" onClick={login} className="px-10 h-12 shadow-xl shadow-cyber-cyan/10">Authorize_Identity</Button>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pb-10 border-b border-white/5">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest">
            <Activity size={10} />
            Command_Center_Online
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Sovereign <span className="text-cyber-cyan">Fleet</span></h1>
          <p className="text-zinc-500 text-sm font-medium max-w-xl">
            Monitor and manage your provisioned autonomous entities. View performance telemetrics, adjust compute rates, and settle earnings.
          </p>
        </div>
        <Button onClick={() => router.push('/dev')} className="h-14 px-8 rounded-2xl gap-3 shadow-xl shadow-white/5 group">
          <Rocket size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          Deploy_New_Entity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active_Nodes', value: agents.length, icon: Cpu, color: 'text-cyber-cyan' },
          { label: 'Total_Earnings', value: agents.reduce((acc, a) => acc + (a.total_earnings || 0), 0).toFixed(4), unit: 'SOL', icon: Wallet, color: 'text-green-400' },
          { label: 'Uptime_Avg', value: '99.9', unit: '%', icon: Activity, color: 'text-blue-400' },
          { label: 'Neural_Load', value: '14.2', unit: 'PFLOPS', icon: Sparkles, color: 'text-purple-400' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-black/40 border border-white/5", stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-mono font-black text-white tracking-tighter">{stat.value}</span>
              {stat.unit && <span className="text-[10px] font-bold text-zinc-500 uppercase">{stat.unit}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.4 }}
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center space-y-6 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
          <div className="w-20 h-20 bg-zinc-900/50 border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-700 mx-auto relative overflow-hidden group">
            <LayoutGrid size={40} className="group-hover:rotate-90 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">No Entities Registered</h3>
            <p className="text-zinc-500 text-sm font-medium max-w-xs mx-auto">Your private fleet registry is currently empty. Provision your first agent in the Studio.</p>
          </div>
          <Button variant="neon" onClick={() => router.push('/dev')} className="h-12 px-8 rounded-xl shadow-lg shadow-cyber-cyan/10">Initialize_Provisioning</Button>
        </div>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
