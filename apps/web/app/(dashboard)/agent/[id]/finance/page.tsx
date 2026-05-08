"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, getAgentCredit, refreshCreditScore, requestAgentLoan, getAgentLoans } from '@/lib/api';
import { 
  Loader2, ArrowLeft, BarChart3, TrendingUp, 
  Wallet, Landmark, Receipt, AlertCircle, 
  CheckCircle2, Gauge, Zap, Info, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AgentFinancePage() {
  const params = useParams();
  const agentId = params.id as string;
  const { isAuthenticated, connected } = useWalletAuth();
  
  const [agent, setAgent] = useState<any>(null);
  const [credit, setCredit] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState('0.1');
  const [bondAmount, setBondAmount] = useState('1.0');
  const [bondDays, setBondDays] = useState('30');
  const [yieldAmount, setYieldAmount] = useState('0.5');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [agentData, creditData, loansData] = await Promise.all([
        getAgent(agentId),
        getAgentCredit(agentId),
        getAgentLoans(agentId)
      ]);
      setAgent(agentData);
      setCredit(creditData);
      setLoans(loansData);
    } catch (err) {
      console.error(err);
      setError("Failed to access Capital Layer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, agentId]);

  const handleRefreshScore = async () => {
    setActionLoading(true);
    try {
      await refreshCreditScore(agentId);
      setSuccess("Credit score recalculated based on recent performance.");
      fetchData();
    } catch (err) {
      setError("Score refresh failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLoan = async () => {
    if (!loanAmount) return;
    setActionLoading(true);
    setError('');
    try {
      await requestAgentLoan(agentId, parseFloat(loanAmount));
      setSuccess(`Loan of ${loanAmount} SOL approved and funded to Agent Treasury.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Loan application rejected.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueBond = async () => {
    setActionLoading(true);
    try {
      const { issueAgentBond } = await import('@/lib/api');
      await issueAgentBond(agentId, parseFloat(bondAmount), parseInt(bondDays));
      setSuccess(`Revenue-backed bond of ${bondAmount} SOL issued successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Bond issuance failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeployYield = async () => {
    setActionLoading(true);
    try {
      const { deployToYield } = await import('@/lib/api');
      const res = await deployToYield(agentId, parseFloat(yieldAmount));
      setSuccess(`Yield deployment proposal created: ${res.proposal_id}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Yield deployment failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Auditing Agent Credit...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-2">
          <Link href="/my-agents" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest mb-2">
            <ArrowLeft size={14} /> Back to Fleet
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">{agent?.name} <span className="text-zinc-500 font-medium">Finance</span></h1>
          <p className="text-zinc-400 text-sm font-medium">Access undercollateralized machine credit and treasury management.</p>
        </div>

        <Button 
          variant="outline"
          onClick={handleRefreshScore}
          isLoading={actionLoading}
          className="border-zinc-800 rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-widest gap-2"
        >
          <Zap size={16} className="text-yellow-500" /> Refresh Credit Score
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Credit Score Gauge */}
        <Card className="lg:col-span-4 bg-[#0c0c0e] border-zinc-800/60 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <Gauge size={140} />
           </div>
           <CardHeader className="pb-2">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Protocol Credit Rating</span>
           </CardHeader>
           <CardContent className="pt-6 space-y-8 relative z-10">
              <div className="text-center space-y-2">
                 <h2 className={cn(
                    "text-6xl font-black tracking-tighter",
                    credit?.credit_score > 700 ? "text-green-400" : credit?.credit_score > 550 ? "text-blue-400" : "text-zinc-400"
                 )}>
                    {credit?.credit_score?.toFixed(0)}
                 </h2>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Agent FICO Equivalent</span>
              </div>

              <div className="space-y-4 pt-4">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-600">Reliability</span>
                    <span className="text-zinc-300">{(agent?.successful_runs / (agent?.total_runs || 1) * 100).toFixed(1)}%</span>
                 </div>
                 <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(agent?.successful_runs / (agent?.total_runs || 1) * 100)}%` }} />
                 </div>

                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-600">Revenue Factor</span>
                    <span className="text-zinc-300">{Math.min(agent?.total_earnings * 10, 100).toFixed(1)}%</span>
                 </div>
                 <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${Math.min(agent?.total_earnings * 10, 100)}%` }} />
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Lending Market */}
        <div className="lg:col-span-8 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/20 border-zinc-800/40 p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                       <Landmark size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Borrowing Limit</span>
                 </div>
                 <p className="text-2xl font-bold text-white">{credit?.credit_limit?.toFixed(4)} <span className="text-xs text-zinc-500 font-medium">SOL</span></p>
                 <p className="text-[10px] text-zinc-600 uppercase mt-1">Based on on-chain reputation</p>
              </Card>

              <Card className="bg-zinc-900/20 border-zinc-800/40 p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                       <TrendingUp size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Utilization</span>
                 </div>
                 <p className="text-2xl font-bold text-white">
                    {credit?.utilization?.toFixed(4)} <span className="text-xs text-zinc-500 font-medium">SOL</span>
                 </p>
                 <p className="text-[10px] text-zinc-600 uppercase mt-1">Current outstanding debt</p>
              </Card>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-zinc-800 bg-[#09090b] p-6 shadow-xl space-y-6">
                 <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                       <Scale size={18} className="text-purple-500" /> Issue Agent Bond
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                       Issue revenue-backed derivatives against future projected earnings. Requires credit score {'>'} 700.
                    </p>
                 </div>
                 <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                       <Input 
                          type="number" 
                          placeholder="Amount (SOL)"
                          value={bondAmount} 
                          onChange={(e: any) => setBondAmount(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white font-mono h-10 text-xs"
                       />
                       <Input 
                          type="number" 
                          placeholder="Days"
                          value={bondDays} 
                          onChange={(e: any) => setBondDays(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white font-mono h-10 text-xs"
                       />
                    </div>
                    <Button 
                       className="w-full h-10 rounded-xl text-xs font-bold bg-purple-500 text-white hover:bg-purple-600 transition-all"
                       onClick={handleIssueBond}
                       isLoading={actionLoading}
                       disabled={!connected || credit?.credit_score < 700}
                    >
                       Issue Bond Contract
                    </Button>
                 </div>
              </Card>

              <Card className="border-zinc-800 bg-[#09090b] p-6 shadow-xl space-y-6">
                 <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                       <BarChart3 size={18} className="text-cyan-500" /> Yield Deployment
                    </h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                       Deploy idle treasury balance to external DeFi protocols (Kamino/MarginFi) via Squads V4.
                    </p>
                 </div>
                 <div className="space-y-3">
                    <Input 
                       type="number" 
                       placeholder="Amount (SOL)"
                       value={yieldAmount} 
                       onChange={(e: any) => setYieldAmount(e.target.value)}
                       className="bg-zinc-950 border-zinc-800 text-white font-mono h-10 text-xs"
                    />
                    <Button 
                       className="w-full h-10 rounded-xl text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-all"
                       onClick={handleDeployYield}
                       isLoading={actionLoading}
                       disabled={!connected || agent?.balance < parseFloat(yieldAmount)}
                    >
                       Propose Yield Deployment
                    </Button>
                 </div>
              </Card>
           </div>

           {/* Apply for Loan */}
           <Card className="border-zinc-800 bg-[#09090b] p-8 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between gap-10">
                 <div className="space-y-4 max-w-sm">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                       <Wallet size={18} className="text-blue-500" /> Fund Treasury
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                       Request a low-interest loan for this agent's treasury. Funds are provided by the AgentOS Reserve and can be used for compute fees or hiring sub-agents.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                       <Info size={14} className="text-zinc-600 shrink-0 mt-0.5" />
                       <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tight">
                          Loans are automatically repaid from agent earnings. Default results in reputation slashing.
                       </p>
                    </div>
                 </div>

                 <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1">Request Amount (SOL)</label>
                       <Input 
                          type="number" 
                          value={loanAmount} 
                          onChange={(e) => setLoanAmount(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white font-mono h-12"
                       />
                    </div>
                    <Button 
                       className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-lg"
                       onClick={handleApplyLoan}
                       isLoading={actionLoading}
                       disabled={!connected || parseFloat(loanAmount) <= 0}
                    >
                       Initialize Loan Request
                    </Button>
                 </div>
              </div>
           </Card>

           {/* Active Loans */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-2">Active Capital Contracts</h3>
              {loans.length === 0 ? (
                 <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-10 text-center space-y-3">
                    <Receipt size={32} className="text-zinc-800 mx-auto" />
                    <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No active loan contracts found in registry</p>
                 </div>
              ) : (
                 <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-zinc-900/40 border-b border-zinc-800/60">
                             <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">ID</th>
                             <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Principal (SOL)</th>
                             <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Rate</th>
                             <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Remaining</th>
                             <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-800/40">
                          {loans.map(loan => (
                             <tr key={loan.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="px-6 py-4 text-xs font-mono text-zinc-400">{loan.id.slice(0, 8)}...</td>
                                <td className="px-6 py-4 text-xs font-semibold text-zinc-200">{loan.principal.toFixed(2)}</td>
                                <td className="px-6 py-4 text-xs text-zinc-400">{loan.interest_rate.toFixed(1)}% APR</td>
                                <td className="px-6 py-4 text-xs font-semibold text-zinc-200">{loan.balance_remaining.toFixed(4)}</td>
                                <td className="px-6 py-4">
                                   <span className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                                      loan.status === 'active' ? "bg-blue-500/10 text-blue-400" :
                                      loan.status === 'defaulted' ? "bg-red-500/10 text-red-400" :
                                      "bg-zinc-800/50 text-zinc-400"
                                   )}>
                                      {loan.status}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
    </div>
  );
}
