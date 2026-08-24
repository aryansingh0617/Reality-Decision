import React, { useState, useEffect } from 'react';
import { FileJson, Download, Cpu, UserCheck, Layers, RefreshCw } from 'lucide-react';
import { fetchW3CProvGraph, DEFAULT_PROV_GRAPH } from '../api';
import { SectionLabel } from './ui';
import { TRANSLATIONS, type Language } from '../i18n';

export const W3CProvView: React.FC<{ lang?: Language }> = ({ lang = 'en' }) => {
  const [graph, setGraph] = useState<any | null>(DEFAULT_PROV_GRAPH);
  const [loading, setLoading] = useState(false);
  const t = TRANSLATIONS[lang];
  const isHindi = lang === 'hi';

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchW3CProvGraph();
      setGraph(data || DEFAULT_PROV_GRAPH);
    } catch (e) {
      console.error('Failed to load W3C PROV graph', e);
      setGraph((prev: any) => prev || DEFAULT_PROV_GRAPH);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const download = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pravah_w3c_prov_audit_${Date.now()}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const g = graph?.['@graph'] || [];
  const count = (fn: (n: any) => boolean) => g.filter(fn).length;

  return (
    <div className="rd-panel flex h-full flex-col overflow-hidden bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-lg">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5 bg-[var(--rd-surface)]">
        <div className="flex items-center gap-2.5">
          <FileJson className="h-4 w-4 text-cyan-400" />
          <div>
            <div className="t-h3 text-white font-bold">{t.tabW3CProv}</div>
            <div className="text-xs text-slate-400 font-mono">
              {isHindi ? 'वैधानिक W3C PROV-O क्रिप्टोग्राफिक निर्णय साक्ष्य ऑडिट ट्रेल' : 'Verifiable, standards-based audit trail (W3C PROV-O)'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {isHindi ? 'रिफ्रेश' : 'Refresh'}
          </button>
          <button onClick={download} disabled={!graph} className="rd-btn rd-btn-primary text-xs font-mono">
            <Download className="h-3.5 w-3.5" /> {isHindi ? 'JSON-LD निर्यात करें' : 'Export JSON-LD'}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {graph ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Layers, label: isHindi ? 'इकाइयां (Entities)' : 'Entities', color: '#38bdf8', n: count((n) => n['@type'] === 'prov:Entity') },
                { icon: UserCheck, label: isHindi ? 'एजेंट (Agents)' : 'Agents', color: '#10b981', n: count((n) => Array.isArray(n['@type']) && n['@type'].includes('prov:Agent')) },
                { icon: Cpu, label: isHindi ? 'गतिविधियां (Activities)' : 'Activities', color: '#f59e0b', n: count((n) => n['@type'] === 'prov:Activity') },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="rd-card px-4 py-3 bg-[var(--rd-panel)] border border-[var(--rd-border)] rounded-xl">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                      <SectionLabel className="text-slate-300 font-bold">{m.label}</SectionLabel>
                    </div>
                    <div className="t-num mt-1 text-[22px] font-bold text-white">{m.n}</div>
                  </div>
                );
              })}
            </div>

            <div>
              <SectionLabel className="mb-2 text-slate-400 font-bold">
                {isHindi ? 'W3C PROV-O JSON-LD स्रोत ग्राफ' : 'Raw W3C PROV-O JSON-LD Graph'}
              </SectionLabel>
              <div className="overflow-x-auto rounded-xl p-4 bg-[#070b12] border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed max-h-[480px]">
                <pre>{JSON.stringify(graph, null, 2)}</pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-xs text-slate-400 font-mono">{isHindi ? 'डेटा लोड हो रहा है…' : 'Loading provenance graph…'}</div>
          </div>
        )}
      </div>
    </div>
  );
};
