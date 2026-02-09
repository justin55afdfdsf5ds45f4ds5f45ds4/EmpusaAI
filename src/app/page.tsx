'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShieldOff,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Play,
  XCircle,
  DollarSign,
  Clock,
  Bell,
  Settings,
  Trash2,
  Plus,
  X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

interface EventEntry {
  id: number;
  type: 'error' | 'blocked' | 'intervention';
  session_id: string;
  message: string;
  timestamp: string;
}

interface BlockedSession {
  session_id: string;
  blocked_reason: string;
  updated_at: string;
  blocked_at: string | null;
  cooldown_minutes: number | null;
  cooldown_remaining: number | null;
}

interface DashboardData {
  blockedRequests24h: number;
  activeLoops: number;
  moneySaved24h: number;
  events: EventEntry[];
  blockedSessions: BlockedSession[];
}

interface Webhook {
  id: number;
  url: string;
  type: string;
  enabled: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setData(await res.json());
    } catch {
      // retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleUnblock = async (sessionId: string) => {
    await fetch('/api/sessions/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center">
        <Activity className="animate-spin" size={32} />
      </div>
    );
  }

  const {
    blockedRequests24h = 0,
    activeLoops = 0,
    moneySaved24h = 0,
    events = [],
    blockedSessions = [],
  } = data || {};

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      {/* Header */}
      <header className="mb-10 border-b border-neutral-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Empusa Guardrail</h1>
          <p className="text-neutral-500 mt-1">Universal API Proxy &amp; Error Kill Switch</p>
        </div>
        <div className="flex gap-3 items-center">
          {activeLoops > 0 ? (
            <span className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 px-3 py-1.5 rounded-full animate-pulse">
              <ShieldAlert size={16} /> {activeLoops} Active Loop{activeLoops !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
              <Activity size={16} /> All Clear
            </span>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Money Saved */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-full bg-green-500/20 text-green-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Money Saved (24h)</p>
              <p className="text-4xl font-mono font-bold text-green-400">${moneySaved24h.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-neutral-600 text-sm">Estimated cost of blocked API calls based on your pricing config.</p>
        </div>

        {/* Requests Blocked */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
              <ShieldOff size={24} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Requests Blocked (24h)</p>
              <p className="text-4xl font-mono font-bold text-yellow-400">{blockedRequests24h}</p>
            </div>
          </div>
          <p className="text-neutral-600 text-sm">API calls intercepted by the guardrail before they could cost money.</p>
        </div>

        {/* Active Loops */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-full ${activeLoops > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-green-500/20 text-green-400'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Active Error Loops</p>
              <p className={`text-4xl font-mono font-bold ${activeLoops > 0 ? 'text-red-400' : 'text-green-400'}`}>{activeLoops}</p>
            </div>
          </div>
          <p className="text-neutral-600 text-sm">Sessions currently blocked due to repeated failures.</p>
        </div>
      </div>

      {/* Blocked Sessions */}
      {blockedSessions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Blocked Sessions</h2>
          <div className="space-y-3">
            {blockedSessions.map((s) => (
              <div key={s.session_id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm text-red-400">{s.session_id}</p>
                    {s.cooldown_remaining != null && s.cooldown_remaining > 0 && (
                      <span className="flex items-center gap-1 text-xs text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                        <Clock size={12} />
                        Auto-recover in {formatSeconds(s.cooldown_remaining)}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-500 text-xs mt-1 truncate">{s.blocked_reason}</p>
                </div>
                <button
                  onClick={() => handleUnblock(s.session_id)}
                  className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-neutral-200 flex items-center gap-2 cursor-pointer shrink-0 ml-4"
                >
                  <Play size={14} fill="black" /> UNBLOCK
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Event Log */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Live Event Log</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {events.length === 0 ? (
            <div className="p-8 text-center text-neutral-600">
              <p>No events yet. Route traffic through <code className="text-neutral-400">localhost:3000/api/proxy</code> to begin.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800 max-h-[500px] overflow-y-auto">
              {events.map((event, i) => (
                <div key={`${event.type}-${event.id}-${i}`} className="px-5 py-3 flex items-start gap-4 hover:bg-neutral-800/30">
                  {event.type === 'error' ? (
                    <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <ShieldOff size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        event.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {event.type === 'error' ? 'Error Received' : 'API Call Blocked'}
                      </span>
                      <span className="text-xs text-neutral-600 font-mono">{event.session_id}</span>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1 truncate">{event.message}</p>
                  </div>
                  <span className="text-xs text-neutral-600 font-mono whitespace-nowrap shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ── Settings Panel ────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'webhooks' | 'costs'>('webhooks');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [costs, setCosts] = useState<Array<{ id: number; domain_pattern: string; cost_per_request: number; label: string | null }>>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookType, setNewWebhookType] = useState('slack');
  const [newDomain, setNewDomain] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const fetchWebhooks = useCallback(async () => {
    const res = await fetch('/api/webhooks');
    if (res.ok) { const d = await res.json(); setWebhooks(d.webhooks); }
  }, []);

  const fetchCosts = useCallback(async () => {
    const res = await fetch('/api/cost-config');
    if (res.ok) { const d = await res.json(); setCosts(d.configs); }
  }, []);

  useEffect(() => { fetchWebhooks(); fetchCosts(); }, [fetchWebhooks, fetchCosts]);

  const addWebhook = async () => {
    if (!newWebhookUrl) return;
    await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newWebhookUrl, type: newWebhookType }),
    });
    setNewWebhookUrl('');
    fetchWebhooks();
  };

  const removeWebhook = async (id: number) => {
    await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchWebhooks();
  };

  const addCost = async () => {
    if (!newDomain || !newCost) return;
    await fetch('/api/cost-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_pattern: newDomain, cost_per_request: parseFloat(newCost), label: newLabel || undefined }),
    });
    setNewDomain('');
    setNewCost('');
    setNewLabel('');
    fetchCosts();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setTab('webhooks')}
            className={`px-5 py-3 text-sm font-medium cursor-pointer ${tab === 'webhooks' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Bell size={14} className="inline mr-2" /> Webhooks
          </button>
          <button
            onClick={() => setTab('costs')}
            className={`px-5 py-3 text-sm font-medium cursor-pointer ${tab === 'costs' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <DollarSign size={14} className="inline mr-2" /> Cost Config
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[50vh]">
          {tab === 'webhooks' && (
            <div>
              <p className="text-neutral-500 text-sm mb-4">Get notified when a session gets blocked. Add Slack or Discord webhook URLs.</p>

              {/* Existing webhooks */}
              <div className="space-y-2 mb-4">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 bg-neutral-800 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-bold uppercase text-neutral-400 w-16">{w.type}</span>
                    <span className="text-sm text-neutral-300 truncate flex-1 font-mono">{w.url}</span>
                    <button onClick={() => removeWebhook(w.id)} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                ))}
                {webhooks.length === 0 && <p className="text-neutral-600 text-sm">No webhooks configured.</p>}
              </div>

              {/* Add new */}
              <div className="flex gap-2">
                <select
                  value={newWebhookType}
                  onChange={(e) => setNewWebhookType(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300"
                >
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </select>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-600"
                />
                <button
                  onClick={addWebhook}
                  className="bg-white text-black px-3 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          )}

          {tab === 'costs' && (
            <div>
              <p className="text-neutral-500 text-sm mb-4">Set the estimated cost per request for each API domain. Used to calculate &quot;Money Saved&quot;.</p>

              {/* Existing configs */}
              <div className="space-y-2 mb-4">
                {costs.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-neutral-800 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-neutral-300 font-mono flex-1">{c.domain_pattern}</span>
                    <span className="text-xs text-neutral-400">{c.label}</span>
                    <span className="text-sm text-green-400 font-mono font-bold">${c.cost_per_request.toFixed(3)}</span>
                  </div>
                ))}
              </div>

              {/* Add/Update */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="api.openai.com"
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-600"
                />
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label"
                  className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-600"
                />
                <input
                  type="number"
                  step="0.001"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="$0.03"
                  className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder-neutral-600"
                />
                <button
                  onClick={addCost}
                  className="bg-white text-black px-3 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Set
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
