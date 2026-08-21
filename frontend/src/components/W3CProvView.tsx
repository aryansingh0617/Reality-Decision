import React, { useState, useEffect } from 'react';
import { FileJson, Download, Cpu, UserCheck, Layers, RefreshCw } from 'lucide-react';
import { fetchW3CProvGraph, DEFAULT_PROV_GRAPH } from '../api';
import { SectionLabel } from './ui';

export const W3CProvView: React.FC = () => {
  const [graph, setGraph] = useState<any | null>(DEFAULT_PROV_GRAPH);
  const [loading, setLoading] = useState(false);

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
    a.download = `reality_decision_audit_${Date.now()}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const g = graph?.['@graph'] || [];
  const count = (fn: (n: any) => boolean) => g.filter(fn).length;

  return (
    <div className="rd-panel flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <FileJson className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <div>
            <div className="t-h3" style={{ color: 'var(--rd-text)' }}>Decision provenance</div>
            <div className="t-caption">A verifiable, standards-based audit trail (W3C PROV-O)</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={load} disabled={loading} className="rd-btn rd-btn-ghost">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'rd-spin-slow' : ''}`} /> Refresh
          </button>
          <button onClick={download} disabled={!graph} className="rd-btn rd-btn-primary">
            <Download className="h-3.5 w-3.5" /> Export JSON-LD
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {graph ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Layers, label: 'Entities', color: 'var(--rd-accent)', n: count((n) => n['@type'] === 'prov:Entity') },
                { icon: UserCheck, label: 'Agents', color: 'var(--rd-success)', n: count((n) => Array.isArray(n['@type']) && n['@type'].includes('prov:Agent')) },
                { icon: Cpu, label: 'Activities', color: 'var(--rd-warn)', n: count((n) => n['@type'] === 'prov:Activity') },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="rd-card px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                      <SectionLabel>{m.label}</SectionLabel>
                    </div>
                    <div className="t-num mt-1.5 text-[20px] font-semibold" style={{ color: 'var(--rd-text)' }}>{m.n}</div>
                  </div>
                );
              })}
            </div>

            <div>
              <SectionLabel className="mb-2">Raw audit graph</SectionLabel>
              <div className="overflow-x-auto rounded-lg p-4" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
                <pre className="leading-relaxed" style={{ fontFamily: 'var(--rd-mono)', fontSize: 11.5, color: 'var(--rd-text-2)' }}>
                  {JSON.stringify(graph, null, 2)}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="t-caption">Loading provenance graph…</div>
          </div>
        )}
      </div>
    </div>
  );
};
