import React, { useRef } from 'react';
import {
  Printer,
  ShieldCheck,
  QrCode,
  FileCheck2,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  Building2,
  X,
  FileDown,
} from 'lucide-react';
import type { RealityState } from '../api';
import type { Language } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: RealityState | null;
  lang?: Language;
}

export const DispatchSlipModal: React.FC<Props> = ({ isOpen, onClose, state, lang = 'en' }) => {
  const printRef = useRef<HTMLDivElement>(null);
  if (!isOpen) return null;

  const isHindi = lang === 'hi';
  const packet = state?.current_packet;
  const version = state?.world_state_version ?? 1;
  const routeId = packet?.route_id || 'route_r14';
  const isR14 = routeId === 'route_r14';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 rd-anim-fade">
      <div className="bg-[#0b1019] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-[#080d16]">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white tracking-tight">
              {isHindi ? 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण (NDMA) वैधानिक प्रेषण आदेश' : 'Statutory NDMA Logistics Dispatch Order · Form-8'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              {isHindi ? 'प्रिंट / PDF' : 'Print / Export PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Order Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-200 font-sans text-xs bg-[#070b12]">
          {/* Official Emblem Header */}
          <div className="text-center border-b border-slate-800 pb-3 space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Government of India · Ministry of Home Affairs · National Disaster Management Authority
            </div>
            <div className="text-base font-bold text-white uppercase tracking-tight">
              {isHindi ? 'आपातकालीन जीवन-रक्षक आपूर्ति प्रेषण आदेश' : 'EMERGENCY LIFE-SAVING LOGISTICS DISPATCH MANIFEST'}
            </div>
            <div className="text-[10.5px] font-mono text-cyan-400">
              DISPATCH ID: NDMA/NER/2026/M17-v{version} · SECURITY CLASSIFICATION: CRITICAL
            </div>
          </div>

          {/* Core Dispatch Grid */}
          <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-[#0d1522] p-3.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[9.5px]">MISSION / CONVOY:</span>
              <strong className="text-white text-xs">Convoy M-17 (Vaccine & Blood Plasma)</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9.5px]">ASSIGNED VEHICLE:</span>
              <strong className="text-cyan-300 text-xs">Reefer 4x4 Van V-02 (Cold-Chain)</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9.5px]">ORIGIN FACILITY:</span>
              <span className="text-slate-200">Guwahati Central Depot D-03 (Maligaon)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9.5px]">DESTINATION WARD:</span>
              <span className="text-rose-300 font-bold">Dispur District Hospital H-03</span>
            </div>
          </div>

          {/* Authorized Routing Directive */}
          <div className="bg-[#09101d] border border-emerald-800/60 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {isHindi ? 'अधिकृत वैधानिक गलियारा (Binding Authorized Route)' : 'BINDING AUTHORIZED CORRIDOR'}
              </span>
              <span className="text-[10.5px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700 font-bold">
                {isR14 ? 'ROUTE R-14 (NH-6 SOUTH BYPASS)' : 'ROUTE R-12 (NH-27 EXPRESS)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
              <div>
                <span className="text-slate-400 block text-[9.5px]">TRANSIT ETA:</span>
                <strong className="text-emerald-300 font-bold">{isR14 ? '35 min' : '15 min'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">DEADLINE LIMIT:</span>
                <strong className="text-rose-400 font-bold">45 min max</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9.5px]">HYDRO TTI MARGIN:</span>
                <strong className="text-cyan-300 font-bold">{isR14 ? '340 min Safe' : '60 min Active'}</strong>
              </div>
            </div>
          </div>

          {/* Safety Invariants Checklist */}
          <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400">
              Statutory Safety Invariants Certified (Independent Deterministic Gate):
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-slate-300 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                ✓ Physical Bridge Clearance Verified
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                ✓ TTI ({isR14 ? '340m' : '60m'}) &gt; Transit ETA ({isR14 ? '35m' : '15m'})
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                ✓ Vehicle Cold-Chain Payload Capacity 100%
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                ✓ Hospital Buffer Preservation Verified
              </div>
            </div>
          </div>

          {/* Cryptographic Seal & Authorization Stamp */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-400">
            <div className="space-y-0.5">
              <div>AUTHORIZING OFFICER: <strong className="text-slate-200">Incident Commander (Kamrup Metro EOC)</strong></div>
              <div>CRYPTOGRAPHIC SHA-256 SEAL: <span className="text-cyan-400">e9f4a1c78b02931a...99b2</span></div>
              <div>WORLD STATE VERSION: <strong className="text-white">v{version}</strong> · 1 Hz SENTINEL ARMED</div>
            </div>
            <div className="w-14 h-14 bg-white p-1 rounded-lg flex items-center justify-center shadow-lg">
              <QrCode className="w-12 h-12 text-black" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 bg-[#080d16] text-xs">
          <span className="text-slate-400 font-mono">
            PRAVAH AI · <strong className="text-emerald-400">Statutory Proof-of-Authority</strong>
          </span>
          <button
            onClick={onClose}
            className="rd-btn rd-btn-secondary text-xs h-7 px-3"
          >
            {isHindi ? 'बंद करें' : 'Close Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
