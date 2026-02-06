import React from 'react';
import { Activity, AlertCircle, CheckCircle, Play, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function MissionControl() {
  const agents = [
    { id: 'replyx-01', name: 'ReplyX Worker #1', status: 'running', uptime: '4h 20m', loops: 0 },
    { id: 'replyx-02', name: 'ReplyX Worker #2', status: 'loop_detected', uptime: '1h 05m', loops: 3 },
    { id: 'scraper-09', name: 'Lead Scraper', status: 'success', uptime: '12m', loops: 1 },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <header className="mb-12 border-b border-neutral-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Empusa Mission Control</h1>
          <p className="text-neutral-500 mt-1">Autonomous Agent State Manager</p>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
            <Activity size={16} /> System Healthy
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => (
          <Link key={agent.id} href={`/agent/${agent.id}`} className="block">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl hover:border-neutral-700 transition-all flex items-center justify-between group cursor-pointer hover:bg-neutral-800/50">
              <div className="flex items-center gap-6">
                <div className={`p-3 rounded-full ${
                  agent.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                  agent.status === 'loop_detected' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {agent.status === 'running' && <Activity />}
                  {agent.status === 'loop_detected' && <AlertCircle />}
                  {agent.status === 'success' && <CheckCircle />}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">{agent.name}</h2>
                  <p className="text-neutral-500 text-sm font-mono">ID: {agent.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Uptime</p>
                  <p className="font-mono text-lg">{agent.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Interventions</p>
                  <p className={`font-mono text-lg ${agent.loops > 0 ? 'text-yellow-400' : 'text-neutral-400'}`}>
                    {agent.loops}
                  </p>
                </div>
                {agent.status === 'loop_detected' && (
                  <button className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-neutral-200 flex items-center gap-2">
                    <Play size={16} fill="black" /> RESUME
                  </button>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
