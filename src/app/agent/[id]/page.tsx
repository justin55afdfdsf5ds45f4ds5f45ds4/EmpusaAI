'use client';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Play, Shield, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Checkpoint {
  step: number;
  action: string;
  status: 'success' | 'failure' | 'loop_detected';
  error?: string;
  errorCode?: string;
  remedyAttempted?: string;
  timestamp: string;
  state?: any;
}

export default function AgentDetail() {
  const params = useParams();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedState, setExpandedState] = useState<number | null>(null);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/logs?sessionId=${params?.id}`);
        const data = await response.json();
        
        if (data.logs) {
          const formattedLogs = data.logs.map((log: any) => ({
            step: log.step,
            action: log.action,
            status: log.status,
            error: log.error,
            errorCode: log.error_code,
            remedyAttempted: log.remedy_attempted,
            timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', { 
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            state: log.state_snapshot ? JSON.parse(log.state_snapshot) : null
          }));
          setCheckpoints(formattedLogs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchLogs();
    
    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchLogs, 2000);
    
    return () => clearInterval(interval);
  }, [params?.id]);
  
  const hasLoopDetected = checkpoints.some(cp => cp.status === 'loop_detected');
  
  // Build remedy chain for display
  const buildRemedyChain = () => {
    const failedAttempts = checkpoints.filter(cp => 
      (cp.status === 'failure' || cp.status === 'loop_detected') && cp.remedyAttempted
    );
    
    return failedAttempts.map((attempt, idx) => ({
      attemptNumber: idx + 1,
      remedy: attempt.remedyAttempted,
      outcome: attempt.status === 'loop_detected' ? 'Loop Detected' : 'Failed',
      errorCode: attempt.errorCode,
      step: attempt.step
    }));
  };
  
  const remedyChain = buildRemedyChain();
  
  const copyStateToClipboard = async (state: any, step: number) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopiedStep(step);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const toggleStateView = (step: number) => {
    setExpandedState(expandedState === step ? null : step);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading agent data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Agent Session
              {hasLoopDetected && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20">Loop Detected</span>
              )}
            </h1>
            <p className="text-neutral-500 text-sm font-mono mt-1">Session ID: {params?.id}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Terminal size={16} /> View Logs
          </button>
          {hasLoopDetected && (
            <button className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 flex items-center gap-2">
              <Play size={16} fill="black" /> Resume Agent
            </button>
          )}
        </div>
      </div>

      {checkpoints.length === 0 ? (
        <div className="max-w-3xl mx-auto mt-12 text-center">
          <p className="text-neutral-500">No logs found for this session.</p>
          <p className="text-neutral-600 text-sm mt-2">Send logs to /api/logs to see them here.</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto mt-12 relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-neutral-800" />
          <div className="space-y-8">
            {checkpoints.map((cp, idx) => (
            <div key={idx} className="relative pl-20 group">
              <span className="absolute left-0 top-1 text-xs text-neutral-600 font-mono">{cp.timestamp}</span>
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
                  <div className="flex items-center gap-2">
                    {cp.errorCode && (
                      <span className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded font-mono">
                        {cp.errorCode}
                      </span>
                    )}
                    <span className="text-xs uppercase tracking-wider font-bold text-neutral-600">Step {cp.step}</span>
                  </div>
                </div>
                {cp.remedyAttempted && (
                  <div className="mb-2 text-xs bg-blue-900/20 text-blue-300 px-2 py-1 rounded border border-blue-800/30">
                    🔧 Remedy: <span className="font-mono">{cp.remedyAttempted}</span>
                  </div>
                )}
                {cp.status !== 'success' && (
                  <div className="mt-3 bg-black/50 p-3 rounded border border-white/5 flex items-start gap-3">
                    {cp.status === 'loop_detected' ? <Shield size={16} className="text-yellow-400 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                    <p className={`text-xs font-mono ${cp.status === 'loop_detected' ? 'text-yellow-200' : 'text-red-300'}`}>
                      {cp.error}
                    </p>
                  </div>
                )}
                {cp.state && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStateView(cp.step)}
                        className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded border border-neutral-700 transition-colors"
                      >
                        {expandedState === cp.step ? '🔽 Hide State' : '🔍 View State'}
                      </button>
                      <button
                        onClick={() => copyStateToClipboard(cp.state, cp.step)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                      >
                        {copiedStep === cp.step ? '✓ Copied!' : '📋 Copy Resume Config'}
                      </button>
                    </div>
                    {expandedState === cp.step && (
                      <div className="mt-2 bg-black/70 p-3 rounded border border-neutral-700 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono">
                          {JSON.stringify(cp.state, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
