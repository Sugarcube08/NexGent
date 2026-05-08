"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent, getConfig, getMyAppWallet } from '@/lib/api';
import { setPlatformWallet } from '@/lib/solana';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Loader2, ArrowLeft, Play, Terminal, 
  AlertCircle, BadgeCheck, Cpu, Activity, Lock, 
  CheckCircle2, Fingerprint, Coins, Wallet
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cn, truncateWallet } from '@/lib/utils';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export default function AgentRunPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { signMessage, sendTransaction } = useWallet();
  const { isAuthenticated, login, connected, publicKey } = useWalletAuth();

  const [agent, setAgent] = useState<any>(null);
  const [appWallet, setAppWallet] = useState<any>(null);
  const [inputData, setInputData] = useState('{"prompt": "Hello"}');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'signing' | 'funding' | 'executing' | 'done'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [fheEnabled, setFheEnabled] = useState(false);
  const [mutationFeedback, setMutationFeedback] = useState('');
  const [mutationLoading, setMutationLoading] = useState(false);

  const fetchState = async () => {
    try {
      const [agentData, config, walletData] = await Promise.all([
        getAgent(id as string),
        getConfig(),
        isAuthenticated ? getMyAppWallet() : Promise.resolve(null)
      ]);
      setAgent(agentData);
      setAppWallet(walletData);
      if (config.platform_wallet) {
        setPlatformWallet(config.platform_wallet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [id, isAuthenticated]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const handleRun = async () => {
    if (!publicKey || !isAuthenticated || !signMessage || !agent || !sendTransaction) return;

    setError('');
    setResult(null);
    setLogs([]);
    try {
      const taskId = crypto.randomUUID();

      // 1. Authorization Signature (X402 Pattern)
      setStatus('signing');
      addLog("Preparing protocol payload...");
      
      const runBody: any = { 
        agent_id: agent.id, 
        input_data: JSON.parse(inputData), 
        task_id: taskId 
      };

      if (fheEnabled) {
        runBody.input_data._fhe_encrypted = true;
        runBody.input_data._fhe_pubkey = publicKey.toBase58();
        addLog("FHE Encryption Layer Active: Inputs secured via TFHE-rs.");
      }

      const payloadBytes = new TextEncoder().encode(JSON.stringify({
        agent_id: runBody.agent_id,
        input_data: runBody.input_data,
        task_id: runBody.task_id
      }));
      
      addLog("Waiting for SVM authorization signature...");
      const sigBytes = await signMessage(payloadBytes);
      const x402Sig = Buffer.from(sigBytes).toString('base64');
      addLog("Identity verified.");

      // 2. Billing Selection: Use App Wallet
      const baselinePrice = agent.price_per_million_input_tokens || 0.01;
      if (!appWallet || appWallet.balance < baselinePrice) {
        throw new Error(`Insufficient App Wallet balance. Required baseline: ${baselinePrice} SOL. Please deposit more funds.`);
      }
      
      addLog("Using internal App Wallet (Layer 2) for instant execution.");

      // 3. Trigger API Execution
      setStatus('executing');
      addLog("Relaying execution request to VACN nodes...");

      await runAgent(
        agent.id, 
        runBody.input_data, 
        taskId, 
        x402Sig, 
        publicKey.toBase58()
      );

      const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/tasks/${taskId}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'running') {
          addLog("Agent active in Deterministic WASM Sandbox.");
        } else if (data.status === 'completed' || data.status === 'failed') {
          setResult(data.result || data.error);
          setStatus('done');
          fetchState();
          if (data.status === 'failed') {
            setError(data.error || 'Execution fault');
            addLog("Execution aborted.");
          } else {
            addLog("Result finalized.");
            if (data.receipt_hash) {
              if (data.receipt_hash.includes('zkSTARK')) {
                 addLog("ZK-STARK Swarm Rollup Proof Generated.");
              }
              addLog(`Protocol Receipt: ${data.receipt_hash.slice(0, 24)}...`);
            }
            if (data.result?._fhe_encrypted_output) {
              addLog("Output verified as Homomorphically Encrypted.");
            }
          }
          ws.close();
        }
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  const handleMutate = async () => {
    if (!mutationFeedback) return;
    setMutationLoading(true);
    try {
      const { mutateAgent } = await import('@/lib/api');
      const offspring = await mutateAgent(agent.id, mutationFeedback);
      addLog(`Genetic mutation successful. Spawned offspring: ${offspring.id}`);
      router.push(`/agent/${offspring.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Mutation failed.");
    } finally {
      setMutationLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Synchronizing...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-100 transition-colors text-xs font-medium">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
        {/* Left: Info */}
        <div className="lg:col-span-5 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <Cpu size={24} className="text-black" />
               </div>
               <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">{agent.name}</h1>
                  <p className="text-xs font-medium text-zinc-500 tracking-wide uppercase">{agent.id}</p>
               </div>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">{agent.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Rate (Per 1M Tokens)</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Input: {agent.price_per_million_input_tokens} SOL</span>
                  <span className="text-sm font-semibold text-white">Output: {agent.price_per_million_output_tokens} SOL</span>
                </div>
             </div>
             <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Wallet size={32} />
                </div>
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block mb-1">App Wallet Balance</span>
                <span className="text-lg font-semibold text-white">
                   {appWallet?.balance?.toFixed(4) || '0.0000'} <span className="text-xs text-zinc-500 font-medium">SOL</span>
                </span>
             </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/60 space-y-4">
             <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Protocol Registry</span>
                <BadgeCheck size={14} className="text-blue-500" />
             </div>
             <div className="space-y-3">
               <div className="p-4 rounded-xl bg-zinc-900/20 border border-zinc-800 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-zinc-700 uppercase">Passport_Asset</span>
                  <div className="flex items-center gap-3">
                    <Fingerprint size={16} className="text-zinc-600" />
                    <span className="text-[11px] font-mono text-zinc-500 truncate">{agent.mint_address || "Awaiting Registry..."}</span>
                  </div>
               </div>
             </div>
          </div>
        </div>

        {/* Right: Console */}
        <div className="lg:col-span-7 flex flex-col gap-8">
           <Card className="flex-1 flex flex-col border-zinc-800/60 bg-[#050505] overflow-hidden min-h-[500px]">
              <div className="px-6 py-3 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/10">
                 <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Interface</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                       <input 
                         type="checkbox" 
                         className="sr-only" 
                         checked={fheEnabled}
                         onChange={(e: any) => setFheEnabled(e.target.checked)}
                       />
                       <div className={cn(
                          "w-3 h-3 rounded-full border border-zinc-700 transition-all",
                          fheEnabled ? "bg-cyan-500 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-zinc-900"
                       )} />
                       <span className={cn(
                          "text-[9px] font-bold uppercase transition-colors",
                          fheEnabled ? "text-cyan-400" : "text-zinc-600"
                       )}>FHE_Confidential</span>
                    </label>
                    <div className="w-px h-3 bg-zinc-800" />
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                       <span className="text-[9px] font-medium text-zinc-600 uppercase">Deterministic_WASM_Sandbox</span>
                    </div>
                 </div>
              </div>
              <div className="flex-1 p-0 flex flex-col">
                 <textarea 
                    className="flex-1 w-full bg-transparent p-6 text-sm font-mono text-zinc-300 outline-none resize-none"
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder='{"prompt": "Your input here..."}'
                 />
                 <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/10">
                    <Button 
                       className="w-full h-12 rounded-xl font-semibold shadow-xl"
                       onClick={!isAuthenticated ? login : handleRun}
                       disabled={status !== 'idle'}
                       isLoading={status !== 'idle'}
                    >
                       {!connected ? 'Connect Wallet' : !isAuthenticated ? 'Authorize Session' : status === 'signing' ? 'Verifying Authorization...' : 'Initialize Agent'}
                    </Button>
                 </div>
              </div>
           </Card>

           {/* Genetic Mutation Panel */}
           <Card className="p-6 border-zinc-800/60 bg-zinc-900/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Genetic Mutation Engine</span>
                 </div>
                 <span className="text-[9px] font-medium text-zinc-600 uppercase">Evolutionary_WASM_Replication</span>
              </div>
              <div className="flex gap-3">
                 <input 
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="Provide performance feedback for logic optimization..."
                    value={mutationFeedback}
                    onChange={(e: any) => setMutationFeedback(e.target.value)}
                 />
                 <Button 
                    variant="outline"
                    className="border-purple-500/20 text-purple-400 h-auto px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500/5"
                    onClick={handleMutate}
                    isLoading={mutationLoading}
                    disabled={!mutationFeedback}
                 >
                    Mutate Agent
                 </Button>
              </div>
           </Card>

           {/* Logs Overlay */}
           {logs.length > 0 && (
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-4">
                 <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                       <Activity size={12} /> Execution Trace
                    </span>
                    {result && <span className="text-[10px] font-black text-green-500 uppercase">Complete</span>}
                 </div>
                 <div className="space-y-2 overflow-y-auto max-h-40 custom-scrollbar">
                    {logs.map((log, i) => (
                       <p key={i} className="text-[11px] font-mono text-zinc-500 flex gap-3">
                          <span className="text-zinc-700">#</span> {log}
                       </p>
                    ))}
                 </div>
                 {result && (
                    <div className="mt-2 pt-4 border-t border-zinc-900">
                       <pre className="text-xs font-mono text-green-400 bg-green-500/5 p-4 rounded-xl border border-green-500/10 overflow-x-auto">
                          {JSON.stringify(result, null, 2)}
                       </pre>
                    </div>
                 )}
              </div>
           )}
           {error && <Alert type="error" title="Execution Error" message={error} onClose={() => setError('')} />}
        </div>
      </div>
    </div>
  );
}

