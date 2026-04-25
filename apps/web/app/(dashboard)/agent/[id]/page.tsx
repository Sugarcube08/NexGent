"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgent, runAgent, getConfig } from '@/lib/api';
import { createEscrowTransaction, confirmTx, setPlatformWallet, PLATFORM_WALLET } from '@/lib/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { 
  Loader2, ArrowLeft, Play, ShieldCheck, Terminal, 
  AlertCircle, CreditCard, BadgeCheck, Cpu, 
  Settings, Activity, Lock, CheckCircle2, Zap
} from 'lucide-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export default function AgentRunPage() {
  const { id } = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { sendTransaction, signMessage } = useWallet();
  const { isAuthenticated, login, connected, publicKey } = useWalletAuth();

  const [agent, setAgent] = useState<any>(null);
  const [inputData, setInputData] = useState('{"text": "Hello world"}');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'paying' | 'verifying' | 'executing' | 'done'>('idle');
  const [paymentType, setPaymentType] = useState<'escrow' | 'solana_pay'>('solana_pay');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      getAgent(id as string),
      getConfig()
    ]).then(([agentData, config]) => {
      setAgent(agentData);
      if (config.platform_wallet) {
        setPlatformWallet(config.platform_wallet);
      }
    })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRun = async () => {
    if (!publicKey || !connected || !isAuthenticated || !signMessage) return;

    setError('');
    setResult(null);
    setLogs([]);
    try {
      const taskId = crypto.randomUUID();
      let referenceBase58 = '';
      let txSignature = '';

      if (paymentType === 'solana_pay') {
        setStatus('paying');
        addLog(`Initializing direct payment for ${agent.price} SOL...`);
        const reference = Keypair.generate().publicKey;
        referenceBase58 = reference.toBase58();

        const { SystemProgram, Transaction } = await import('@solana/web3.js');
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(PLATFORM_WALLET),
            lamports: agent.price * 1e9,
          })
        );
        tx.instructions[0].keys.push({ pubkey: reference, isSigner: false, isWritable: false });

        txSignature = await sendTransaction(tx, connection);
        addLog(`Transaction broadcast: ${txSignature.slice(0, 16)}...`);

        setStatus('verifying');
        addLog("Waiting for network confirmation (finality)...");
        await confirmTx(connection, txSignature);
        addLog("Payment confirmed on Devnet.");
      } else {
        setStatus('paying');
        addLog(`Deriving Escrow PDA for Task ${taskId.slice(0, 8)}...`);
        const { tx, reference } = await createEscrowTransaction(
          publicKey,
          new PublicKey(agent.creator_wallet),
          taskId,
          agent.price
        );
        referenceBase58 = reference.toBase58();
        txSignature = await sendTransaction(tx, connection);
        addLog(`Escrow initialized: ${txSignature.slice(0, 16)}...`);

        setStatus('verifying');
        addLog("Waiting for vault verification...");
        await confirmTx(connection, txSignature);
        addLog("Vault locked successfully.");
      }

      setStatus('executing');
      addLog("Sending execution request to Swarm Runtime...");

      const payloadStr = JSON.stringify({
        agent_id: agent.id,
        input_data: JSON.parse(inputData),
        task_id: taskId,
        reference: referenceBase58,
        payment_type: paymentType
      });

      const msgBytes = new TextEncoder().encode(payloadStr);
      const signatureBytes = await signMessage(msgBytes);
      const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

      await runAgent(
        agent.id,
        JSON.parse(inputData),
        taskId,
        referenceBase58,
        paymentType,
        signatureBase64,
        publicKey.toBase58(),
        txSignature 
      );

      // Start WebSocket for real-time updates
      const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/tasks/${taskId}`;
      addLog(`Connecting to secure execution channel...`);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === 'running') {
          addLog("Agent is now executing in a hardened sandbox.");
        } else if (data.status === 'completed' || data.status === 'failed') {
          setResult(data.result || data.error);
          setStatus('done');
          if (data.status === 'failed') {
            setError(data.error || data.result || 'Execution failed');
            addLog("!! Execution aborted due to internal agent error.");
          } else {
            addLog("Execution complete. Proof anchored to Solana.");
          }
          ws.close();
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        setError('Real-time connection failed. Falling back to dashboard status.');
        setStatus('done');
      };

    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setStatus('idle');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 font-black uppercase tracking-tighter">
      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.2)]" />
      <p className="text-zinc-500">Decrypting Agent Metadata...</p>
    </div>
  );

  if (!agent) return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <AlertCircle size={48} className="text-zinc-800" />
      <p className="text-zinc-400 font-bold">Protocol Error: Agent not found.</p>
      <Button onClick={() => router.push('/')}>Return to Marketplace</Button>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black text-xs uppercase tracking-widest bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700"
        >
          <ArrowLeft size={14} />
          Terminal_Exit
        </button>
        
        <div className="flex items-center gap-3">
           <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Instance_Active</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Command & Identity */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="border-zinc-800 bg-zinc-950 rounded-[32px] overflow-visible">
            <CardHeader className="border-b border-zinc-900 p-8 pb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.3)]">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">{agent.name}</h1>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{agent.id}</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                {agent.description || "Deploy autonomous operations on Solana with this high-performance AI agent."}
              </p>
            </CardHeader>
            <CardContent className="p-8 pt-6 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-inner">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Execution Price</p>
                    <p className="text-xl font-black text-blue-500">{agent.price} <span className="text-[10px] text-zinc-500 ml-1">SOL</span></p>
                  </div>
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-inner">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Reputation</p>
                    <p className="text-xl font-black text-green-400">{agent.reputation_score?.toFixed(0) || "100"}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentType('solana_pay')}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                        paymentType === 'solana_pay'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                          : 'border-zinc-800 bg-zinc-900/30 text-zinc-600 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <Zap size={20} className={paymentType === 'solana_pay' ? "text-blue-400" : "text-zinc-700"} />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-none">Instant<br/>Settlement</span>
                    </button>
                    <button
                      onClick={() => setPaymentType('escrow')}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                        paymentType === 'escrow'
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                          : 'border-zinc-800 bg-zinc-900/30 text-zinc-600 hover:border-zinc-700 hover:bg-zinc-900/50'
                      )}
                    >
                      <Lock size={20} className={paymentType === 'escrow' ? "text-purple-400" : "text-zinc-700"} />
                      <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-none">Trustless<br/>Escrow</span>
                    </button>
                  </div>
               </div>

               <div className="pt-4 border-t border-zinc-900 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Asset Provenance</p>
                    {agent.mint_address && <BadgeCheck size={14} className="text-blue-500" />}
                  </div>
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 shadow-inner">
                        <Activity size={18} className="text-zinc-600" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 leading-none">Mint Address</p>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">{agent.mint_address || "Awaiting Mint Verification..."}</p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Execution Hub */}
        <div className="xl:col-span-8 space-y-8">
           <Card className="border-zinc-800 bg-zinc-950 rounded-[32px] overflow-hidden flex flex-col min-h-[600px] shadow-2xl">
              <CardHeader className="bg-zinc-900/40 p-6 border-b border-zinc-900 flex flex-row items-center justify-between px-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <Terminal size={18} className="text-blue-500" />
                  </div>
                  <h3 className="font-black text-white uppercase tracking-[0.2em] text-sm">Control_Interface</h3>
                </div>
                <div className="flex items-center gap-4">
                   <div className="hidden md:flex flex-col items-end">
                      <p className="text-[9px] font-black text-zinc-500 uppercase leading-none">Runtime</p>
                      <p className="text-[10px] font-bold text-zinc-300">Hardened_Sandbox_v3</p>
                   </div>
                   <div className="w-px h-6 bg-zinc-800 mx-2" />
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-xl border border-zinc-800">
                     <Cpu size={14} className="text-zinc-600" />
                     <span className="text-[10px] font-black text-zinc-400 uppercase">256MB RAM</span>
                   </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 flex flex-col md:flex-row">
                 {/* Input Side */}
                 <div className="flex-1 p-8 space-y-6 border-b md:border-b-0 md:border-r border-zinc-900">
                    <div className="space-y-4 h-full flex flex-col">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Payload_Data (JSON)</p>
                          <span className="text-[9px] font-bold text-blue-500/80 uppercase tracking-tighter">Validated_Schema</span>
                       </div>
                       <textarea 
                          className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-[24px] p-6 text-sm font-mono text-blue-400/90 outline-none focus:border-blue-500/50 transition-all resize-none shadow-inner"
                          value={inputData}
                          onChange={(e) => setInputData(e.target.value)}
                          placeholder='{"key": "value"}'
                       />
                       
                       {error && (
                         <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex gap-3 items-center animate-in shake duration-500">
                           <AlertCircle size={16} className="shrink-0" />
                           {error}
                         </div>
                       )}

                       <div className="pt-2">
                          <Button 
                            className="w-full h-16 rounded-[24px] text-lg font-black tracking-tight gap-4 shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all bg-blue-600 border-t border-white/20 active:scale-95"
                            onClick={handleRun}
                            disabled={!connected || !isAuthenticated || (status !== 'idle' && status !== 'done')}
                            isLoading={status !== 'idle' && status !== 'done'}
                          >
                             {status === 'paying' ? 'SIGNING_PAYMENT...' :
                              status === 'verifying' ? 'VERIFYING_NETWORK...' :
                               status === 'executing' ? 'EXECUTING_CYCLES...' :
                                'PAY & INITIALIZE AGENT'}
                          </Button>
                          {!connected && <p className="text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-4">Wallet_Required_for_Authentication</p>}
                       </div>
                    </div>
                 </div>

                 {/* Console/Result Side */}
                 <div className="w-full md:w-[45%] bg-zinc-950/50 p-8 flex flex-col">
                    <div className="space-y-6 h-full flex flex-col">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Process_Log</p>
                          <Activity size={14} className="text-zinc-800" />
                       </div>
                       
                       <div className="flex-1 bg-black/40 border border-zinc-900 rounded-[24px] p-6 overflow-hidden flex flex-col relative">
                          {logs.length === 0 && !result ? (
                             <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30 grayscale">
                                <Settings size={32} className="text-zinc-600 animate-spin-slow" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Awaiting_Command</p>
                             </div>
                          ) : (
                             <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[11px] custom-scrollbar pb-10">
                                {logs.map((log, i) => (
                                   <div key={i} className="text-zinc-400 break-words leading-relaxed animate-in fade-in duration-300">
                                      <span className="text-blue-500/60 mr-2 mr-2">»</span>
                                      {log}
                                   </div>
                                ))}
                                {result && (
                                   <div className="mt-6 pt-4 border-t border-zinc-900 space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl w-fit">
                                         <CheckCircle2 size={12} className="text-green-500" />
                                         <span className="text-[9px] font-black uppercase text-green-500 tracking-widest">Output_Verified</span>
                                      </div>
                                      <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap break-all leading-relaxed">
                                         {JSON.stringify(result, null, 2)}
                                      </pre>
                                   </div>
                                )}
                             </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
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

import { Bot } from 'lucide-react';
