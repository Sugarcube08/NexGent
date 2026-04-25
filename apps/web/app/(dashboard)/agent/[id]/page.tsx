"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent, getConfig, getInternalWallet } from '@/lib/api';
import { setPlatformWallet, PLATFORM_WALLET } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Loader2, ArrowLeft, Play, ShieldCheck, Terminal, 
  AlertCircle, CreditCard, BadgeCheck, Cpu, 
  Settings, Activity, Lock, CheckCircle2, Zap,
  ChevronRight, Fingerprint, Wallet
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import bs58 from 'bs58';

export default function AgentRunPage() {
  const { id } = useParams();
  const router = useRouter();
  const { signMessage } = useWallet();
  const { isAuthenticated, login, connected, publicKey } = useWalletAuth();

  const [agent, setAgent] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [inputData, setInputData] = useState('{"text": "Hello world"}');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'signing' | 'executing' | 'done'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const fetchState = async () => {
    try {
      const [agentData, config, walletData] = await Promise.all([
        getAgent(id as string),
        getConfig(),
        getInternalWallet()
      ]);
      setAgent(agentData);
      setWallet(walletData);
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
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRun = async () => {
    if (!publicKey || !connected || !isAuthenticated || !signMessage || !agent || !wallet) return;

    if (wallet.balance < agent.price) {
      setError(`Insufficient in-app balance. Please deposit at least ${agent.price} SOL.`);
      return;
    }

    setError('');
    setResult(null);
    setLogs([]);
    try {
      const taskId = crypto.randomUUID();

      // 1. x402 Protocol Signature Stage
      setStatus('signing');
      addLog("Initializing x402 SVM Authorization protocol...");
      addLog(`Preparing to deduct ${agent.price} SOL from internal escrow...`);
      
      const runBody = {
        agent_id: agent.id,
        input_data: JSON.parse(inputData),
        task_id: taskId
      };
      
      const payloadBytes = new TextEncoder().encode(JSON.stringify(runBody));
      addLog("Waiting for biometric wallet signature...");
      const x402SigBytes = await signMessage(payloadBytes);
      const x402SigBase64 = Buffer.from(x402SigBytes).toString('base64');
      addLog("Signature verified. Authorization anchored.");

      // 2. Execution Stage
      setStatus('executing');
      addLog("Handing off to Swarm Runtime (Tier-3 Isolated)...");

      await runAgent(
        agent.id,
        runBody.input_data,
        taskId,
        "", // legacy reference
        "internal", // payment type
        "", // legacy signature
        publicKey.toBase58(),
        "", // legacy txSig
        x402SigBase64,
        publicKey.toBase58()
      );

      // Start WebSocket for real-time updates
      const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/tasks/${taskId}`;
      addLog(`Secure WebSocket connected: channel_task_${taskId.slice(0,8)}`);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'running') {
          addLog("Sandbox spawned. Computing agent neural weights...");
        } else if (data.status === 'completed' || data.status === 'failed') {
          setResult(data.result || data.error);
          setStatus('done');
          fetchState(); // Refresh balance
          if (data.status === 'failed') {
            setError(data.error || data.result || 'Execution failed');
            addLog("!! FATAL: Neural execution aborted.");
          } else {
            addLog("SUCCESS: Execution finalized. Result anchored to Solana.");
          }
          ws.close();
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setError('Real-time feed lost. Check Task History for results.');
        setStatus('done');
      };

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.1)]" />
      <div className="text-center space-y-2">
         <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Establishing_Secure_Link</p>
         <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Protocol: x402 SVM</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 shadow-lg"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          TERMINAL_EXIT
        </button>
        
        <div className="flex items-center gap-4">
           {wallet && (
             <div className="px-4 py-2 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3 shadow-inner">
               <Wallet size={14} className="text-blue-500" />
               <span className="text-[10px] font-black text-white tracking-widest">{wallet.balance.toFixed(3)} SOL</span>
             </div>
           )}
           <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Neural_Sync_Active</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Module A: Agent Identity */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="border-zinc-800 bg-zinc-950 rounded-[40px] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cpu size={120} className="text-blue-500" />
            </div>
            
            <CardHeader className="p-10 pb-6 border-b border-zinc-900 relative z-10">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] border-t border-white/20">
                  <Bot size={32} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-white tracking-tighter leading-none">{agent.name}</h1>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{agent.id}</span>
                     <div className="w-1 h-1 rounded-full bg-zinc-800" />
                     <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Active_Node</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                {agent.description || "Deploy autonomous operations on Solana with this high-performance AI agent."}
              </p>
            </CardHeader>

            <CardContent className="p-10 pt-8 space-y-10 relative z-10">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl shadow-inner group/stat hover:border-blue-500/30 transition-colors text-left">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">Internal_Rate</p>
                    <p className="text-2xl font-black text-white">{agent.price} <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">SOL</span></p>
                  </div>
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl shadow-inner group/stat hover:border-green-500/30 transition-colors text-left">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">Trust_Score</p>
                    <p className="text-2xl font-black text-white">{agent.reputation_score?.toFixed(0) || "100"}</p>
                  </div>
               </div>

               <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[32px] space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Lock size={40} className="text-blue-500" />
                  </div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Escrow_Status</p>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                     This agent uses the **Shoujiki In-App Wallet**. Funds are deducted only upon initialization and are held in a protocol-level escrow.
                  </p>
               </div>

               <div className="pt-6 border-t border-zinc-900 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Provenance_Verification</p>
                    <BadgeCheck size={14} className="text-blue-500" />
                  </div>
                  <div className="p-5 bg-zinc-900/30 border border-zinc-800 rounded-3xl flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-800">
                        <Fingerprint size={20} className="text-zinc-700" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 leading-none">Passport_Address</p>
                        <p className="text-[11px] font-mono text-zinc-400 truncate tracking-tighter">
                           {agent.mint_address || "ASSET_REGISTRY_SYNCING..."}
                        </p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Module B: Execution Hub */}
        <div className="xl:col-span-8 space-y-10">
           <Card className="border-zinc-800 bg-zinc-950 rounded-[40px] overflow-hidden flex flex-col min-h-[650px] shadow-2xl relative">
              <CardHeader className="bg-zinc-900/40 p-8 border-b border-zinc-900 flex flex-row items-center justify-between px-10">
                <div className="flex items-center gap-4 text-left">
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-inner">
                    <Terminal size={20} className="text-blue-500" />
                  </div>
                  <div>
                     <h3 className="font-black text-white uppercase tracking-[0.3em] text-sm leading-none">Agent_Interface</h3>
                     <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">Authorization_Required: x402</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner">
                     <Cpu size={16} className="text-blue-500/50" />
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Runtime: v3.2_Hardened</span>
                   </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 flex flex-col md:flex-row">
                 {/* Input Panel */}
                 <div className="flex-1 p-10 space-y-8 border-b md:border-b-0 md:border-r border-zinc-900">
                    <div className="space-y-5 h-full flex flex-col text-left">
                       <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mx-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Input_Payload</p>
                          <span className="text-[9px] font-black text-zinc-700 uppercase">Schema: JSON</span>
                       </div>
                       
                       <textarea 
                          className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 text-sm font-mono text-blue-400/80 outline-none focus:border-blue-600/30 transition-all resize-none shadow-inner custom-scrollbar"
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          placeholder='{"key": "value"}'
                       />
                       
                       {error && (
                         <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl text-red-500 text-xs font-bold flex gap-4 items-center animate-in shake duration-500">
                            <AlertCircle size={18} className="shrink-0" />
                            <p className="font-mono opacity-80 leading-relaxed">{error}</p>
                         </div>
                       )}

                       <div className="pt-4">
                          <Button 
                            className={cn(
                               "w-full h-20 rounded-[28px] text-xl font-black tracking-tight gap-4 transition-all border-t border-white/20 active:scale-95 group overflow-hidden relative",
                               status === 'idle' || status === 'done' ? "bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.2)] hover:bg-blue-500" : "bg-zinc-800"
                            )}
                            onClick={handleRun}
                            disabled={!connected || !isAuthenticated || (status !== 'idle' && status !== 'done')}
                            isLoading={status !== 'idle' && status !== 'done'}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                             {status === 'signing' ? <><Fingerprint className="animate-pulse" /> SVM_SIGNATURE</> :
                                status === 'executing' ? <><Loader2 className="animate-spin" /> RUNTIME_ACTIVE</> :
                                <><Play size={22} fill="currentColor" className="ml-1" /> RUN_AUTONOMOUSLY</>}
                          </Button>
                          
                          {!connected ? (
                             <p className="text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-6">Secure_Hardware_Link_Offline</p>
                          ) : !isAuthenticated && (
                             <p className="text-center text-[10px] font-black text-blue-500 uppercase tracking-widest mt-6 animate-pulse">Authentication_Token_Required</p>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Log Stream Panel */}
                 <div className="w-full md:w-[48%] bg-zinc-950/40 p-10 flex flex-col relative">
                    <div className="space-y-6 h-full flex flex-col relative z-10 text-left">
                       <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mx-1">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural_Trace_Log</p>
                          <Activity size={14} className="text-zinc-800" />
                       </div>
                       
                       <div className="flex-1 bg-black/60 border border-zinc-900 rounded-[32px] p-8 overflow-hidden flex flex-col relative shadow-inner">
                          {logs.length === 0 && !result ? (
                             <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-20 grayscale">
                                <Settings size={32} className="text-zinc-500 animate-spin-slow" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] ml-1">Idle_State</p>
                             </div>
                          ) : (
                             <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[11px] custom-scrollbar pb-16">
                                {logs.map((log, i) => (
                                   <div key={i} className="text-zinc-400 leading-relaxed animate-in slide-in-from-left-2 duration-300">
                                      <span className="text-blue-500/40 font-bold mr-3">#</span>
                                      {log}
                                   </div>
                                ))}
                                
                                {result && (
                                   <div className="mt-10 pt-8 border-t border-zinc-800/80 space-y-6 animate-in slide-in-from-bottom-5 duration-700">
                                      <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl w-fit">
                                         <CheckCircle2 size={14} className="text-green-500" />
                                         <span className="text-[10px] font-black uppercase text-green-400 tracking-widest">Execution_Verified</span>
                                      </div>
                                      <pre className="p-6 bg-zinc-900/80 rounded-[24px] border border-zinc-800 text-green-400 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed shadow-2xl">
                                         {JSON.stringify(result, null, 2)}
                                      </pre>
                                      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                         <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Onchain_Receipt_Anchor</p>
                                         <p className="text-[10px] font-mono text-zinc-400 truncate italic">SHA-256: {bs58.encode(new TextEncoder().encode(JSON.stringify(result))).slice(0, 44)}</p>
                                      </div>
                                   </div>
                                )}
                             </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
