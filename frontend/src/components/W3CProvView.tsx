import React, { useState, useEffect } from 'react';
import { FileJson, Download, Cpu, UserCheck, Layers, RefreshCw } from 'lucide-react';
import { fetchW3CProvGraph } from '../api';

export const W3CProvView: React.FC = () => {
  const [provGraph, setProvGraph] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await fetchW3CProvGraph();
      setProvGraph(data);
    } catch (e) {
      console.error('Failed to load W3C PROV graph', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const downloadJSONLD = () => {
    if (!provGraph) return;
    const blob = new Blob([JSON.stringify(provGraph, null, 2)], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `w3c_prov_audit_${Date.now()}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-[#0d1117] border border-[#222b34] rounded-lg p-5 flex flex-col font-mono text-xs overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#222b34] mb-4">
        <div>
          <div className="text-sm font-bold text-[#e8edf2] flex items-center gap-2">
            <FileJson className="w-4 h-4 text-[#00f2fe]" />
            <span>W3C PROV-O JSON-LD AUDIT GRAPH EXPORTER</span>
          </div>
          <div className="text-[10px] text-[#8a9aaa]">Standardized Judicial Provenance Graph (http://www.w3.org/ns/prov#)</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadGraph}
            disabled={loading}
            className="px-3 py-1.5 bg-[#14191e] border border-[#222b34] rounded hover:text-[#00f2fe] transition-all flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH GRAPH</span>
          </button>
          <button
            onClick={downloadJSONLD}
            disabled={!provGraph}
            className="px-3.5 py-1.5 bg-[#00f2fe] text-[#07090b] font-extrabold rounded hover:bg-[#38bdf8] transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON-LD</span>
          </button>
        </div>
      </div>

      {/* RDF Graph Nodes */}
      {provGraph && provGraph['@graph'] ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[#14191e] border border-[#222b34] rounded">
              <div className="text-[10px] text-[#8a9aaa] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00f2fe]" />
                <span>RDF ENTITIES</span>
              </div>
              <div className="text-lg font-bold text-[#e8edf2] mt-1">
                {provGraph['@graph'].filter((n: any) => n['@type'] === 'prov:Entity').length}
              </div>
            </div>
            <div className="p-3 bg-[#14191e] border border-[#222b34] rounded">
              <div className="text-[10px] text-[#8a9aaa] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#2ecc71]" />
                <span>AGENTS</span>
              </div>
              <div className="text-lg font-bold text-[#e8edf2] mt-1">
                {provGraph['@graph'].filter((n: any) => Array.isArray(n['@type']) && n['@type'].includes('prov:Agent')).length}
              </div>
            </div>
            <div className="p-3 bg-[#14191e] border border-[#222b34] rounded">
              <div className="text-[10px] text-[#8a9aaa] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>ACTIVITIES</span>
              </div>
              <div className="text-lg font-bold text-[#e8edf2] mt-1">
                {provGraph['@graph'].filter((n: any) => n['@type'] === 'prov:Activity').length}
              </div>
            </div>
          </div>

          {/* Raw JSON-LD Inspector */}
          <div className="bg-[#07090b] border border-[#222b34] rounded p-4 overflow-x-auto">
            <pre className="text-[11px] text-[#2ecc71] font-mono leading-relaxed">
              {JSON.stringify(provGraph, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-[#8a9aaa]">Loading W3C Provenance Graph...</div>
      )}
    </div>
  );
};
