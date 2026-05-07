"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  Connection,
  NodeProps,
  Edge,
  Node,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Square, Bot, GitBranch, Save, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// --- Custom Nodes ---

const nodeStyle = "px-4 py-3 rounded-xl border bg-[#0c0c0e] shadow-2xl relative group";

const StartNode = ({ data }: NodeProps) => (
  <div className={`${nodeStyle} border-green-500/50 bg-green-500/5 min-w-[120px] text-center`}>
    <div className="flex items-center justify-center gap-2 text-green-400 font-black tracking-widest text-[10px] uppercase">
      <Play size={12} /> Start
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500 border-2 border-[#0c0c0e]" />
  </div>
);

const EndNode = ({ data }: NodeProps) => (
  <div className={`${nodeStyle} border-red-500/50 bg-red-500/5 min-w-[120px] text-center`}>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500 border-2 border-[#0c0c0e]" />
    <div className="flex items-center justify-center gap-2 text-red-400 font-black tracking-widest text-[10px] uppercase">
      <Square size={12} /> End
    </div>
  </div>
);

const AgentNode = ({ id, data }: NodeProps) => {
  const agents = data.agents as any[] || [];
  
  return (
    <div className={`${nodeStyle} border-blue-500/50 bg-blue-500/5 min-w-[200px]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-[#0c0c0e]" />
      <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold tracking-widest text-[10px] uppercase">
        <Bot size={12} /> Executor Agent
      </div>
      <div className="space-y-2">
        <select 
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] font-medium text-zinc-200"
          value={data.agent_id as string || ''}
          onChange={(e) => (data as any).onChange(id, 'agent_id', e.target.value)}
        >
          <option value="">Select Agent...</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-[#0c0c0e]" />
    </div>
  );
};

const ConditionNode = ({ id, data }: NodeProps) => (
  <div className={`${nodeStyle} border-purple-500/50 bg-purple-500/5 min-w-[200px]`}>
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-[#0c0c0e]" />
    <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold tracking-widest text-[10px] uppercase">
      <GitBranch size={12} /> Logic Gate
    </div>
    <div className="space-y-2">
      <Input 
        placeholder="Field (e.g. status)" 
        className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
        value={data.field as string || ''}
        onChange={(e) => (data as any).onChange(id, 'field', e.target.value)}
      />
      <Input 
        placeholder="Value (e.g. success)" 
        className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
        value={data.value as string || ''}
        onChange={(e) => (data as any).onChange(id, 'value', e.target.value)}
      />
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500 border-2 border-[#0c0c0e]" />
  </div>
);

const nodeTypes = {
  START: StartNode,
  END: EndNode,
  AGENT: AgentNode,
  CONDITION: ConditionNode,
};

// --- Flow Builder Component ---

interface SwarmFlowBuilderProps {
  agents: any[];
  onSave: (workflow: any) => void;
  isLoading: boolean;
}

const initialNodes: Node[] = [
  { id: 'start', type: 'START', position: { x: 50, y: 200 }, data: {} },
  { id: 'end', type: 'END', position: { x: 800, y: 200 }, data: {} }
];

function Flow({ agents, onSave, isLoading }: SwarmFlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState('');

  const updateNodeData = useCallback((id: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Inject agents and updateNodeData into agent/condition nodes
  const nodesWithData = nodes.map(node => {
    if (node.type === 'AGENT' || node.type === 'CONDITION') {
      return {
        ...node,
        data: {
          ...node.data,
          agents,
          onChange: updateNodeData
        }
      };
    }
    return node;
  });

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({
    ...params,
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
  }, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      // Approximate coordinates
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const newNode = {
        id: `${type.toLowerCase()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        position,
        data: type === 'AGENT' ? { agent_id: '' } : { field: '', value: '' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = () => {
    // Map to backend expected format
    const formattedNodes = nodes.map(n => {
      const config = { ...n.data };
      delete config.agents;
      delete config.onChange;
      return {
        id: n.id,
        type: n.type,
        config: config,
        position: n.position
      };
    });

    const formattedEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition: '' // Advanced conditions can be added later
    }));

    onSave({
      name,
      nodes: formattedNodes,
      edges: formattedEdges
    });
  };

  return (
    <div className="flex w-full h-[600px] border border-zinc-800 rounded-[24px] overflow-hidden bg-[#050505]">
      {/* Drag & Drop Palette */}
      <div className="w-64 border-r border-zinc-800 bg-[#09090b] flex flex-col">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-1">Protocol Architect</h3>
          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">Drag nodes onto the board to build your non-deterministic swarm.</p>
        </div>
        
        <div className="flex-1 p-5 space-y-4">
          <div 
            className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3 cursor-grab hover:bg-blue-500/10 transition-colors"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'AGENT')}
            draggable
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Bot size={16} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Executor Agent</p>
              <p className="text-[9px] text-zinc-500 font-medium">Specialized node worker</p>
            </div>
          </div>

          <div 
            className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center gap-3 cursor-grab hover:bg-purple-500/10 transition-colors"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'CONDITION')}
            draggable
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><GitBranch size={16} /></div>
            <div>
              <p className="text-xs font-bold text-zinc-200">Logic Gate</p>
              <p className="text-[9px] text-zinc-500 font-medium">Conditional routing</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/30 space-y-4">
          <Input 
            placeholder="Protocol Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-950 border-zinc-800 h-10 text-xs"
          />
          <Button 
            className="w-full h-10 rounded-xl font-bold gap-2 text-xs shadow-xl shadow-blue-900/10" 
            onClick={handleSave} 
            isLoading={isLoading}
            disabled={!name || nodes.length < 2}
          >
            <Zap size={14} /> Register Swarm
          </Button>
        </div>
      </div>

      {/* Board Zone */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodesWithData}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#050505]"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function SwarmFlowBuilder(props: SwarmFlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
