"use client";

import { useState, useEffect } from 'react';
import { getAgents, getWorkflows, createWorkflow, runWorkflow, getWorkflowRuns } from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, Activity, Layers, Terminal, Share2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';
import SwarmFlowBuilder from '@/components/swarms/SwarmFlowBuilder';

export default function SwarmsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [agentsData, workflowsData, runsData] = await Promise.all([
        getAgents(),
        getWorkflows(),
        getWorkflowRuns()
      ]);
      
      setAgents(agentsData);
      setWorkflows(workflowsData);
      setRuns(runsData);
    } catch (err) {
      console.error("Failed to fetch swarm data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (workflowPayload: any) => {
    setCreating(true);
    try {
      const payload = {
        ...workflowPayload,
        id: workflowPayload.name.toLowerCase().replace(/\s+/g, '-'),
      };
      await createWorkflow(payload);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleRun = async (workflowId: string) => {
    setRunningId(workflowId);
    setError('');
    try {
      await runWorkflow(workflowId, { start: true }, 0.1);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to start swarm. Ensure graph integrity.');
    } finally {
      setRunningId(null);
    }
  };

  if (loading && workflows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-zinc-600" size={24} />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Orchestrating Graph...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24 text-left">
      <div className="space-y-2 border-b border-zinc-900 pb-10">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Node Connector</h1>
        <p className="text-zinc-400 text-sm font-medium">Design non-deterministic agent swarms with logic gates, conditional branching, and autonomous routing.</p>
      </div>

      {/* Visual Flow Builder */}
      <div className="w-full">
        <SwarmFlowBuilder 
          agents={agents} 
          onSave={handleCreate} 
          isLoading={creating} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start mt-12">
        {/* Dash */}
        <div className="xl:col-span-12 space-y-12">
           <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                 <Share2 size={18} className="text-blue-500" /> Active Swarm Protocols
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {workflows.map(wf => (
                    <Card key={wf.id} className="border-zinc-800/60 bg-[#0c0c0e] group hover:border-zinc-700 transition-all">
                       <CardHeader className="flex flex-row justify-between items-start pb-2">
                          <div>
                             <h4 className="font-semibold text-zinc-100">{wf.name}</h4>
                             <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{wf.id}</p>
                          </div>
                          <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                             <Activity size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                          </div>
                       </CardHeader>
                       <CardContent className="space-y-4">
                          <div className="flex gap-4">
                             <div className="text-center">
                                <p className="text-[8px] font-black text-zinc-600 uppercase">Nodes</p>
                                <p className="text-lg font-mono font-bold text-zinc-400">{wf.nodes?.length || 0}</p>
                             </div>
                             <div className="text-center">
                                <p className="text-[8px] font-black text-zinc-600 uppercase">Edges</p>
                                <p className="text-lg font-mono font-bold text-zinc-400">{wf.edges?.length || 0}</p>
                             </div>
                             <div className="text-center">
                                <p className="text-[8px] font-black text-zinc-600 uppercase">Agents</p>
                                <p className="text-lg font-mono font-bold text-zinc-400">
                                    {wf.nodes?.filter((n: any) => n.type === 'AGENT').length || 0}
                                </p>
                             </div>
                          </div>
                          
                          <Button variant="secondary" size="sm" className="w-full rounded-lg text-[10px] font-black tracking-widest uppercase h-9" 
                             onClick={() => handleRun(wf.id)}
                             isLoading={runningId === wf.id}
                             disabled={!!runningId}
                          >
                             Instantiate Swarm
                          </Button>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                 <Terminal size={18} className="text-zinc-500" /> Consensus Logs
              </h2>
              <div className="space-y-4">
                 {runs.map(run => (
                    <div key={run.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between group hover:bg-zinc-900/60 transition-all">
                       <div className="flex items-center gap-5">
                          <div className={cn(
                             "w-1 h-10 rounded-full transition-all duration-1000",
                             run.status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                             run.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'
                          )} />
                          <div>
                             <h5 className="text-sm font-semibold text-zinc-200">
                                {workflows.find(w => w.id === run.workflow_id)?.name || "Task_Chain"}
                             </h5>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                   "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                                   run.status === 'completed' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-zinc-500 border-zinc-800 bg-zinc-900'
                                )}>{run.status}</span>
                                <span className="text-[9px] font-mono text-zinc-600 uppercase">{run.id.slice(0, 16)}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-2">
                             <Layers size={10} className="text-zinc-600" />
                             <span className="text-[9px] font-mono text-zinc-500">{run.active_nodes?.length || 0} Frontier Active</span>
                          </div>
                          <div className="w-24 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50 shadow-inner">
                             <div 
                                className="h-full bg-blue-500 transition-all duration-700" 
                                style={{ width: run.status === 'completed' ? '100%' : '33%' }}
                             />
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
    </div>
  );
}
