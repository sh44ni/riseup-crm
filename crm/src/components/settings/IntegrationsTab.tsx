import React, { useState } from 'react';
import {
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Activity,
  Layers,
  Phone,
  CreditCard,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { IntegrationItem } from '@/types/settingsTypes';

interface IntegrationsTabProps {
  integrations: IntegrationItem[];
  onTestBackendPing?: () => void;
}

export function IntegrationsTab({ integrations }: IntegrationsTabProps) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [latencies, setLatencies] = useState<Record<string, number>>({
    'int-fastapi': 14,
    'int-eagleview': 180,
    'int-twilio': 42,
    'int-stripe': 85,
    'int-gaf': 110,
    'int-quickbooks': 340,
  });

  const handleTestPing = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 25) + 12;
      setLatencies((prev) => ({
        ...prev,
        [id]: id === 'int-fastapi' ? simulatedLatency : prev[id] || 45,
      }));
      setTestingId(null);
    }, 600);
  };

  const getCategoryIcon = (category: IntegrationItem['category']) => {
    switch (category) {
      case 'backend':
        return Database;
      case 'aerial':
        return Layers;
      case 'communication':
        return Phone;
      case 'payments':
        return CreditCard;
      case 'manufacturer':
        return ShieldCheck;
      default:
        return Cpu;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================
          SECTION 1: FASTAPI BACKEND POOL MONITOR
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/20 text-[#1878B8] flex items-center justify-center border border-blue-300/40">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>FastAPI Async Engine & PostgreSQL Connection</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                  Live Connected
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Core Python 3.12 microservice pool handling CRM records, estimator calculations, and telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestPing('int-fastapi')}
              disabled={testingId === 'int-fastapi'}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98]"
            >
              <RefreshCw
                size={13}
                className={
                  testingId === 'int-fastapi'
                    ? 'animate-spin text-[#1878B8]'
                    : 'text-slate-400'
                }
              />
              <span>
                {testingId === 'int-fastapi' ? 'Testing Ping...' : 'Ping Backend'}
              </span>
            </button>
            <a
              href="http://localhost:8000/developer"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span>Developer Portal</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Backend Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Endpoint URL
            </div>
            <div className="font-mono font-bold text-slate-900 truncate">
              http://localhost:8000/api
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              SSL / CORS Whitelist Active
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Real-Time Latency
            </div>
            <div className="font-mono font-bold text-emerald-600 text-base flex items-center gap-1">
              <Zap size={14} />
              <span>{latencies['int-fastapi']} ms</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Ultra-fast local socket
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PostgreSQL AsyncPG Pool
            </div>
            <div className="font-bold text-slate-900 text-sm">
              10 / 10 Connected
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Connection pooling active
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Auth Hash Standard
            </div>
            <div className="font-bold text-slate-900 text-sm">
              Argon2id Multi-Tenant
            </div>
            <div className="text-[10px] text-purple-600 font-semibold">
              Memory-hard cryptographic hash
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          SECTION 2: ROOFING PLATFORMS & GATEWAYS
          ================================================================ */}
      <div className="light-glass-card rounded-3xl p-6 border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Connected Field & Business Gateways
            </h3>
            <p className="text-xs text-slate-500">
              Third-party APIs enabling aerial roof take-offs, customer messaging, and payments.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {integrations.length} Services Configured
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((item) => {
            const Icon = getCategoryIcon(item.category);
            const isDegraded = item.status === 'degraded';

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 text-[#1878B8] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon size={18} />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isDegraded
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#1878B8] transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {item.lastSync}
                  </span>
                  <button
                    onClick={() => handleTestPing(item.id)}
                    disabled={testingId === item.id}
                    className="text-[11px] font-bold text-[#1878B8] hover:underline flex items-center gap-1"
                  >
                    <span>{testingId === item.id ? 'Pinging...' : 'Test'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
