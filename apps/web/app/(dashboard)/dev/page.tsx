"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { deployAgent, testAgent } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { 
  Code2, 
  Rocket, 
  AlertCircle, 
  FileJson, 
  Plus, 
  Trash2, 
  Play, 
  FileCode,
  Package,
  Layers,
  Terminal,
  ChevronRight,
  Cpu,
  ShieldCheck,
  Activity,
  Workflow
} from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import Editor from "@monaco-editor/react";
import { Alert } from '@/components/ui/Alert';

export default function DevSpacePage() {
  const router = useRouter();
  const { isAuthenticated, login, connected } = useWalletAuth();
  
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    description: '',
    price: 0.01,
  });

  const [files, setFiles] = useState<Record<string, string>>({
    'main.py': `from shoujiki import shoujiki
import json

class Agent:
    def run(self, input_data):
        print(f"Executing with input: {input_data}")
        
        # Example: Hiring another agent for sub-task
        # result = shoujiki.hire_agent("summarizer", {"text": "Long content..."})
        
        return {
            "status": "success",
            "message": "Hello from Shoujiki Agent!",
            "data_received": input_data
        }

agent = Agent()`,
    'utils.py': '# Add helper functions here\ndef format_msg(msg):\n    return f"Processed: {msg}"'
  });
  
  const [selectedFile, setSelectedFile] = useState('main.py');
  const [requirements, setRequirements] = useState<string[]>(['requests']);
  const [newDep, setNewDep] = useState('');
  const [entrypoint, setEntrypoint] = useState('main.py');
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddFile = () => {
    const filename = prompt('Enter filename (e.g. models.py):');
    if (filename && !files[filename]) {
      setFiles({ ...files, [filename]: '# New file content' });
      setSelectedFile(filename);
    }
  };

  const handleDeleteFile = (filename: string) => {
    if (filename === entrypoint) return alert('Cannot delete entrypoint');
    const newFiles = { ...files };
    delete newFiles[filename];
    setFiles(newFiles);
    if (selectedFile === filename) setSelectedFile(entrypoint);
  };

  const handleAddDep = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newDep.trim()) {
      e.preventDefault();
      if (!requirements.includes(newDep.trim())) {
        setRequirements([...requirements, newDep.trim()]);
      }
      setNewDep('');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setTestResult(null);
    try {
      const res = await testAgent({
        ...metadata,
        id: metadata.id || 'test-agent',
        name: metadata.name || 'Test Agent',
        files,
        requirements,
        entrypoint,
        version: 'test-' + Date.now()
      });
      setTestResult(res);
      if (res.success) setSuccessMsg('Local simulation successful!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDeploy = () => {
    if (!isAuthenticated) return;
    
    if (!metadata.id.trim() || !metadata.name.trim()) {
      setError('Agent ID and Display Name are required');
      return;
    }

    const draft = {
      ...metadata,
      files,
      requirements,
      entrypoint,
      version: 'v' + Date.now()
    };
    
    localStorage.setItem('shoujiki_draft', JSON.stringify(draft));
    router.push('/deploy');
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-8 bg-zinc-950 border border-zinc-900 rounded-[40px] shadow-2xl">
        <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-inner">
          <AlertCircle size={48} className="text-zinc-700" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal Locked</h2>
          <p className="text-zinc-500 font-medium">Link your Solana wallet to access the Agent IDE.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-zinc-900 pb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400">
            <Code2 size={12} />
            Developer Environment
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
            Agent <span className="text-zinc-500 text-3xl">IDE</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-xl leading-relaxed">
             Build, test, and deploy autonomous supply-chain agents. Use our secure bridge to hire other agents on-the-fly.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <Button 
            variant="outline" 
            onClick={handleTest} 
            isLoading={testing} 
            className="flex-1 lg:flex-none h-14 rounded-2xl gap-3 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-sm font-black"
          >
            <Play size={18} className="fill-current" />
            SIMULATE
          </Button>
          <Button 
            onClick={handleDeploy} 
            isLoading={loading} 
            className="flex-1 lg:flex-none h-14 px-10 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.3)] bg-blue-600 border-t border-blue-400/30 text-sm font-black gap-3"
          >
            <Rocket size={18} />
            LAUNCH PACKAGE
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Col: Config */}
        <div className="xl:col-span-3 space-y-8">
          <Card className="border-zinc-800 bg-zinc-950 overflow-visible">
            <CardHeader className="border-b border-zinc-900 pb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-400">
                <Workflow size={16} className="text-blue-500" />
                Blueprint
              </h3>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Input 
                label="Agent ID (Unique)" 
                placeholder="e.g. data-analyzer-v1" 
                value={metadata.id}
                onChange={e => setMetadata({...metadata, id: e.target.value})}
                className="bg-zinc-900/50 border-zinc-800 rounded-xl py-3 focus:border-blue-500"
              />
              <Input 
                label="Public Display Name" 
                placeholder="e.g. Sentinel AI" 
                value={metadata.name}
                onChange={e => setMetadata({...metadata, name: e.target.value})}
                className="bg-zinc-900/50 border-zinc-800 rounded-xl py-3 focus:border-blue-500"
              />
              <div className="relative">
                <Input 
                  label="Runtime Price (SOL)" 
                  type="number" 
                  value={metadata.price}
                  onChange={e => setMetadata({...metadata, price: parseFloat(e.target.value)})}
                  className="bg-zinc-900/50 border-zinc-800 rounded-xl py-3 focus:border-blue-500"
                />
                <span className="absolute right-4 top-10 text-[10px] font-black text-blue-500 uppercase">Per Run</span>
              </div>
              <TextArea 
                label="Description" 
                placeholder="What does this agent do?"
                value={metadata.description}
                onChange={e => setMetadata({...metadata, description: e.target.value})}
                className="bg-zinc-900/50 border-zinc-800 rounded-xl h-28 focus:border-blue-500"
              />
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950">
            <CardHeader className="border-b border-zinc-900 pb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-400">
                <Package size={16} className="text-purple-500" />
                Environment
              </h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="relative">
                <Input 
                  placeholder="Add pip package..." 
                  value={newDep}
                  onChange={e => setNewDep(e.target.value)}
                  onKeyDown={handleAddDep}
                  className="bg-zinc-900/50 border-zinc-800 rounded-xl py-3 pr-10"
                />
                <Plus size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              </div>
              <div className="flex flex-wrap gap-2">
                {requirements.map(dep => (
                  <span key={dep} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-2 group transition-all hover:border-purple-500/40">
                    {dep}
                    <button onClick={() => setRequirements(requirements.filter(r => r !== dep))}>
                      <Plus size={12} className="rotate-45 text-purple-500 group-hover:text-red-400 transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 font-medium px-1">Note: Standard AI libraries (OpenAI, Langchain, HTTPX) are pre-installed.</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Editor & Console */}
        <div className="xl:col-span-9 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[650px]">
            {/* File Tree */}
            <Card className="lg:col-span-1 border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col rounded-[24px]">
              <CardHeader className="py-5 border-b border-zinc-900 flex flex-row items-center justify-between px-6 bg-zinc-900/30">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Source Tree</h4>
                <button onClick={handleAddFile} className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-blue-500 transition-all">
                  <Plus size={16} />
                </button>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {Object.keys(files).map(filename => (
                  <div 
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={`flex items-center justify-between group px-4 py-3 rounded-xl cursor-pointer transition-all ${
                      selectedFile === filename 
                      ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' 
                      : 'hover:bg-zinc-900 border border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileCode size={16} className={selectedFile === filename ? 'text-blue-500' : 'text-zinc-600'} />
                      <span className="text-xs font-black uppercase tracking-tight truncate">{filename}</span>
                      {entrypoint === filename && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {entrypoint !== filename && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEntrypoint(filename); }} 
                          className="p-1 hover:text-blue-400 transition-colors"
                          title="Set as Main Execution Point"
                        >
                          <Layers size={14} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}
                        className="p-1 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-zinc-900/30 border-t border-zinc-900">
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                     <Cpu size={14} className="text-blue-500" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white leading-none">V3 Runtime</p>
                     <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Linux Namespace</p>
                   </div>
                </div>
              </div>
            </Card>

            {/* Code Editor */}
            <Card className="lg:col-span-3 border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col rounded-[24px] shadow-2xl relative">
              <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-900 bg-zinc-900/40 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  </div>
                  <div className="h-4 w-px bg-zinc-800 mx-2" />
                  <div className="flex items-center gap-3">
                    <FileCode size={18} className="text-blue-400" />
                    <span className="text-xs font-black font-mono text-zinc-300 uppercase tracking-widest">{selectedFile}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded-full uppercase tracking-tighter">Python 3.11</span>
                  {entrypoint === selectedFile && (
                    <span className="text-[9px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-[0_0_10px_rgba(59,130,246,0.1)]">Main Entrypoint</span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={files[selectedFile]}
                  onChange={(val) => setFiles({ ...files, [selectedFile]: val || '' })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    padding: { top: 30, bottom: 20 },
                    scrollbar: {
                      vertical: 'hidden',
                      horizontal: 'hidden'
                    },
                    cursorStyle: 'block',
                    cursorBlinking: 'smooth',
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Test Console */}
          {(testResult || error) && (
            <Card className="bg-black/40 border-zinc-800 overflow-hidden rounded-[24px]">
              <CardHeader className="py-4 border-b border-zinc-900 flex flex-row items-center justify-between px-8 bg-zinc-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Simulation_Output</h3>
                </div>
                {testResult?.success && (
                  <div className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase">
                    <ShieldCheck size={14} />
                    Integrity Verified
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {error && (
                  <div className="p-6 bg-red-500/5 border-b border-red-500/10 text-red-500 text-xs font-mono flex gap-3 items-start">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-black uppercase mb-1">Execution Error:</p>
                      {error}
                    </div>
                  </div>
                )}
                {testResult && (
                  <div className="p-8">
                    <pre className="text-sm font-mono text-zinc-400 overflow-auto max-h-80 custom-scrollbar leading-relaxed">
                      <div className="text-zinc-600 mb-4 font-bold border-b border-zinc-900 pb-2">--- START OF EXECUTION RECEIPT ---</div>
                      {JSON.stringify(testResult, null, 2)}
                      <div className="text-zinc-600 mt-4 font-bold border-t border-zinc-900 pt-2">--- END OF EXECUTION RECEIPT ---</div>
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert 
          type="success" 
          title="Verification Passed" 
          message={successMsg} 
          onClose={() => setSuccessMsg('')} 
        />
      )}
      {error && (
        <Alert 
          type="error" 
          title="System Warning" 
          message={error} 
          onClose={() => setError('')} 
        />
      )}
    </div>
  );
}
