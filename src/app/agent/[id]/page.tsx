'use client';
import React from 'react';
import { ArrowLeft, AlertTriangle, Play, Shield, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const MOCK_CHECKPOINTS = [
  { step: 1, action: 'GoToUrl("https://example.com/login")', status: 'success', time: '10:42:01' },
  { step: 2, action: 'Click("Login Button")', status: 'success', time: '10:42:05' },
  { step: 3, action: 'Type("username", "admin")', status: 'success', time: '10:42:08' },
  { step: 4, action: 'Click("Submit")', status: 'failure', error: 'Element not interactive', time: '10:42:12' },
  { step: 5, action: 'Click("Submit")', status: 'failure', error: 'Element not interactive', time: '10:42:15' },
  { step: 6, action: 'Click("Submit")', status: 'loop_detected', error: 'SYSTEM INTERVENTION: Loop Blocked', time: '10:42:15' },
];

export default function AgentDetail() {
  const params = useParams();
  
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              ReplyX Worker #2
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20">Loop Detected</span>
            </h1>
            <p className="text-neutral-500 text-sm font-mono mt-1">Session ID: {params?.id}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Terminal size={16} /> View Logs
          </button>
          <button className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 flex items-center gap-2">
            <Play size={16} fill="black" /> Resume Agent
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-12 relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-neutral-800" />
        <div className="space-y-8">
          {MOCK_CHECKPOINTS.map((cp, idx) => (
            <div key={idx} className="relative pl-20 group">
              <span className="absolute left-0 top-1 text-xs text-neutral-600 font-mono">{cp.time}</span>
              <div className={`absolute left-[26px] top-1 w-4 h-4 rounded-full border-4 border-neutral-950 z-10
                ${cp.status === 'success' ? 'bg-green-500' :
                  cp.status === 'loop_detected' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`}
              />
              <div className={`p-4 rounded-lg border transition-all ${
                cp.status === 'loop_detected'
                  ? 'bg-yellow-500/5 border-yellow-500/30 shadow-[0_0_30px_-10px_rgba(234,179,8,0.2)]'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-mono text-sm text-blue-300 font-bold">{cp.action}</h3>
                  <span className="text-xs uppercase tracking-wider font-bold text-neutral-600">Step {cp.step}</span>
                </div>
                {cp.status !== 'success' && (
                  <div className="mt-3 bg-black/50 p-3 rounded border border-white/5 flex items-start gap-3">
                    {cp.status === 'loop_detected' ? <Shield size={16} className="text-yellow-400 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                    <p className={`text-xs font-mono ${cp.status === 'loop_detected' ? 'text-yellow-200' : 'text-red-300'}`}>
                      {cp.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
