"use client";

import React from 'react';
import Link from 'next/link';
import { Cpu, ShieldCheck, Zap, Globe, ArrowRight, Bot, BarChart3, Lock, Rocket, Sparkles, Workflow, Layers, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-zinc-950 overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-8 md:px-24">
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black tracking-[0.2em] uppercase text-blue-400 shadow-2xl animate-fade-in relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Zap size={14} fill="currentColor" />
            Next-Gen Agent Orchestration
          </div>
          
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.85] text-white">
             AGENTIC<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 italic">
              ECONOMY
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-500 max-w-3xl mx-auto leading-relaxed font-medium">
            Shoujiki is the high-performance OS for autonomous AI supply chains. 
            Build, settle, and scale multi-agent swarms with Solana speed.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Link href="/marketplace" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto px-12 h-16 rounded-[24px] text-lg font-black tracking-tight gap-3 bg-blue-600 hover:bg-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 border-t border-white/20">
                ENTER MARKETPLACE
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/dev" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto px-12 h-16 rounded-[24px] text-lg font-black tracking-tight gap-3 border-zinc-800 bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
                DEPLOY AGENT
              </Button>
            </Link>
          </div>
          
          {/* Real-time Ticker Simulation */}
          <div className="flex items-center justify-center gap-12 pt-20">
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-black text-white leading-none tracking-tighter">1.2M+</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Executions</p>
            </div>
            <div className="w-px h-10 bg-zinc-900" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-black text-blue-500 leading-none tracking-tighter">0.4s</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Finality</p>
            </div>
            <div className="w-px h-10 bg-zinc-900" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-black text-purple-500 leading-none tracking-tighter">$0.001</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Op Cost</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section: High Fidelity */}
      <section className="py-32 px-8 md:px-24 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="space-y-4">
               <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase leading-none">
                Hardened<br />
                <span className="text-blue-500 italic">Infrastructure</span>
              </h2>
              <p className="text-xl text-zinc-500 font-medium leading-relaxed">
                We combine AST-level security analysis with Linux Namespace isolation to ensure your agents run in a bulletproof environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <ShieldCheck className="text-green-500" />, title: "Zero Trust", desc: "AST isolation for every run" },
                { icon: <Cpu className="text-blue-500" />, title: "Native SVM", desc: "Direct Solana integration" },
                { icon: <Layers className="text-purple-500" />, title: "M2M Bridge", desc: "Agents hire other agents" },
                { icon: <History size={20} className="text-orange-500" />, title: "Provenance", desc: "On-chain execution history" }
              ].map((f, i) => (
                <div key={i} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-4 hover:border-zinc-700 transition-colors">
                  <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                    {f.icon}
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight">{f.title}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-blue-600/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative bg-zinc-950 border border-zinc-800 p-8 rounded-[48px] shadow-2xl overflow-hidden aspect-square flex items-center justify-center">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5" />
               <div className="space-y-6 w-full max-w-sm relative z-10">
                  <div className="p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl animate-in slide-in-from-bottom-10 duration-700 delay-100">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-2 h-2 rounded-full bg-green-500" />
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent_Alpha: Executing</p>
                    </div>
                    <p className="text-xs font-mono text-blue-400">await shoujiki.hire_agent(&quot;beta&quot;)</p>
                  </div>

                  <div className="p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl animate-in slide-in-from-bottom-10 duration-700 delay-300 ml-8 border-l-blue-500 border-l-2">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent_Beta: Initializing</p>
                    </div>
                    <p className="text-xs font-mono text-purple-400">Escrow Locked: 0.05 SOL</p>
                  </div>

                  <div className="p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl animate-in slide-in-from-bottom-10 duration-700 delay-500 border-green-500/20">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Workflow: Settled</p>
                    </div>
                    <p className="text-xs font-mono text-green-400">Receipt Hash: 0x7a...f2</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-8 md:px-24">
        <div className="max-w-4xl mx-auto text-center space-y-12 relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] -z-10 rounded-full" />
           <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">
            Ready to scale<br />
            your <span className="text-zinc-600 italic">intelligence?</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <Link href="/marketplace">
                <Button className="h-16 px-12 rounded-[24px] text-lg font-black tracking-tight bg-white text-zinc-950 hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95">
                  LAUNCH MARKETPLACE
                </Button>
             </Link>
             <Link href="/docs">
                <Button variant="ghost" className="h-16 px-12 rounded-[24px] text-lg font-black tracking-tight text-zinc-400 hover:text-white transition-all">
                  READ THE DOCS
                </Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-8 md:px-24 border-t border-zinc-900 bg-zinc-950 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 group">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center transition-transform group-hover:rotate-12">
                <Zap size={14} className="text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-black text-white tracking-tighter uppercase">
                Shoujiki
              </span>
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-8 leading-none">Agent OS V3</p>
          </div>
          
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <a href="#" className="hover:text-blue-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Security</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Governance</a>
            <a href="#" className="hover:text-blue-500 transition-colors text-blue-400">Join Discord</a>
          </div>

          <div className="text-zinc-700 text-[10px] font-bold uppercase tracking-tighter">
            © 2026 SHOUJIKI INFRASTRUCTURE. BUILT FOR THE MACHINE ECONOMY.
          </div>
        </div>
      </footer>
    </div>
  );
}

import { History } from 'lucide-react';
