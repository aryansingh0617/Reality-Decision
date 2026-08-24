import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Globe2,
  Layers,
  MapPin,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Truck,
  Wifi,
  WifiOff,
  Zap,
  TrendingDown,
  Navigation,
  Database,
  Camera,
  Languages,
  Package,
  TrendingUp,
  Sliders,
  UserCheck,
} from 'lucide-react';
import { TRANSLATIONS, type Language } from '../i18n';

export type DashboardMode = 'DISTRICT_CONNECTIVITY' | 'LOGISTICS_BOTTLENECKS' | 'EMERGENCY_ROUTES' | 'DELIVERY_STATUS';

interface PravahViewsProps {
  currentMode: DashboardMode;
  onSelectMode: (mode: DashboardMode) => void;
  lang: Language;
  onToggleLang: () => void;
  worldVersion: number;
  onInjectDisruption: (entityId: string, status: string) => void;
}

export function PravahDataBadge({ type, lang = 'en' }: { type: 'REAL' | 'SIMULATED' | 'PREDICTED' | 'DERIVED'; lang?: Language }) {
  const styles = {
    REAL: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    SIMULATED: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    PREDICTED: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    DERIVED: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
  };

  const textMap = {
    REAL: lang === 'hi' ? 'वास्तविक (REAL)' : 'REAL',
    SIMULATED: lang === 'hi' ? 'सिमुलेटेड (SIM)' : 'SIMULATED',
    PREDICTED: lang === 'hi' ? 'पूर्वानुमानित (PRED)' : 'PREDICTED',
    DERIVED: lang === 'hi' ? 'व्युत्पन्न (DER)' : 'DERIVED',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border shadow-sm ${styles[type]}`}>
      {textMap[type]}
    </span>
  );
}

export function PravahDashboardViews({
  currentMode,
  onSelectMode,
  lang,
  onToggleLang,
  worldVersion,
  onInjectDisruption,
}: PravahViewsProps) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'COMMANDER' | 'DISTRICT_OFFICER' | 'FIELD_SCOUT' | 'LOGISTICS_OP'>('COMMANDER');

  // Field Report Form State
  const [formType, setFormType] = useState('ROAD_BLOCKED');
  const [formLoc, setFormLoc] = useState('Saraighat Bridge Northern Causeway (NH-27)');
  const [formSeverity, setFormSeverity] = useState('CRITICAL');
  const [formDesc, setFormDesc] = useState('');
  const [formOfficer, setFormOfficer] = useState('Officer R. Das (Kamrup Metro EOC)');

  const t = TRANSLATIONS[lang];
  const isHindi = lang === 'hi';

  const fetchDashboardData = async () => {
    try {
      const [distRes, btnRes, misRes, connRes, repRes] = await Promise.all([
        fetch('/api/districts').then((r) => r.json()),
        fetch('/api/bottlenecks').then((r) => r.json()),
        fetch('/api/missions').then((r) => r.json()),
        fetch('/api/connectors').then((r) => r.json()),
        fetch('/api/field-reports').then((r) => r.json()),
      ]);
      if (distRes?.districts) setDistricts(distRes.districts);
      if (btnRes?.bottlenecks) setBottlenecks(btnRes.bottlenecks);
      if (misRes?.missions) setMissions(misRes.missions);
      if (connRes?.connectors) setConnectors(connRes.connectors);
      if (repRes?.reports) setReports(repRes.reports);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const iv = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(iv);
  }, [worldVersion]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      incident_type: formType,
      location_name: formLoc,
      coordinates: [26.19, 91.745],
      severity: formSeverity,
      confidence: 'VERIFIED',
      description: formDesc || (isHindi ? 'फील्ड स्काउट द्वारा दर्ज बाधा।' : 'Field observer recorded disruption affecting corridor reachability.'),
      reported_by: formOfficer,
      photo_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=60',
    };

    if (!isOnline) {
      setOfflineQueue((q) => [payload, ...q]);
      setReportModalOpen(false);
      return;
    }

    try {
      await fetch('/api/field-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setFormDesc('');
      setReportModalOpen(false);
      fetchDashboardData();
    } catch {
      setOfflineQueue((q) => [payload, ...q]);
      setReportModalOpen(false);
    }
  };

  return (
    <div className="bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl p-4 text-slate-100 shadow-xl space-y-3.5">
      {/* 4 Dedicated PS 26002 Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rd-border)] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectMode('DISTRICT_CONNECTIVITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              currentMode === 'DISTRICT_CONNECTIVITY'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            {t.tabDistricts}
          </button>

          <button
            onClick={() => onSelectMode('LOGISTICS_BOTTLENECKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              currentMode === 'LOGISTICS_BOTTLENECKS'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {t.tabBottlenecks}
          </button>

          <button
            onClick={() => onSelectMode('EMERGENCY_ROUTES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              currentMode === 'EMERGENCY_ROUTES'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            {t.tabRoutes}
          </button>

          <button
            onClick={() => onSelectMode('DELIVERY_STATUS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              currentMode === 'DELIVERY_STATUS'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-sm'
                : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-purple-400" />
            {t.tabMissions}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* RBAC Role Indicator */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#111a27] border border-slate-800 text-slate-300">
            <UserCheck className="w-3 h-3 text-cyan-400" />
            <span>Role:</span>
            <strong className="text-cyan-300 font-bold">{selectedRole}</strong>
          </div>

          {/* Sync Status Badge */}
          <div
            className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border font-mono font-semibold ${
              isOnline
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/40'
                : 'bg-amber-950/50 text-amber-300 border-amber-700/40'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? (isHindi ? 'लाइव सिंक सक्रिय' : 'LIVE SYNC') : `${t.offlineStatus} (${offlineQueue.length})`}
          </div>

          {/* Field Report Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-md shadow font-bold transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            {t.submitReport}
          </button>
        </div>
      </div>

      {/* VIEW 1: DISTRICT CONNECTIVITY & SUPPLY GAP INTELLIGENCE */}
      {currentMode === 'DISTRICT_CONNECTIVITY' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              {isHindi ? 'पूर्वोत्तर क्षेत्र — जिला कनेक्टिविटी एवं पहुंच सूचकांक' : 'North Eastern Region — District Connectivity Grid'}
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">
              {isHindi ? 'विश्व स्थिति संस्करण' : 'World State'}: v{worldVersion}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {districts.map((d) => (
              <div
                key={d.id}
                className="bg-[var(--rd-panel)] border border-[var(--rd-border)] rounded-xl p-3 space-y-2 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white">
                        {isHindi && d.name.includes('Kamrup') ? 'कामरूप मेट्रोपॉलिटन' : d.name}
                      </span>
                      <PravahDataBadge type={d.data_classification || 'SIMULATED'} lang={lang} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{d.state}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      d.status === 'FULLY_ACCESSIBLE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : d.status === 'PARTIALLY_DEGRADED'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-red-950 text-red-300 border-red-700'
                    }`}
                  >
                    {isHindi 
                      ? (d.status === 'FULLY_ACCESSIBLE' ? 'पूर्णतः सुलभ' : d.status === 'PARTIALLY_DEGRADED' ? 'आंशिक प्रभावित' : 'प्रतिबंधित')
                      : d.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Accessibility Score Bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-0.5">
                    <span className="text-slate-400">{isHindi ? 'सुलभता सूचकांक:' : 'Accessibility:'}</span>
                    <span className="font-bold text-cyan-300">{d.accessibility_score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        d.accessibility_score > 80
                          ? 'bg-emerald-400'
                          : d.accessibility_score > 50
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${d.accessibility_score}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                  <span>{isHindi ? 'अड़चनें:' : 'Bottlenecks:'} <strong className="text-slate-200">{d.active_bottlenecks_count}</strong></span>
                  <span>{isHindi ? 'सक्रिय मिशन:' : 'Missions:'} <strong className="text-cyan-300">{d.critical_missions_count}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* ADDON: SUPPLY GAP INTELLIGENCE */}
          <div className="bg-[#090e17] border border-cyan-900/40 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                {isHindi ? 'क्षेत्रीय आपूर्ति कमी विश्लेषण (Supply Gap Intelligence)' : 'Regional Supply Gap Intelligence · Pilot District'}
              </span>
              <PravahDataBadge type="REAL" lang={lang} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-[#0f172a] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isHindi ? 'आपातकालीन वैक्सीन / ब्लड:' : 'Emergency Vaccines:'}</span>
                <strong className="text-rose-400 font-bold">-18% Deficit</strong>
                <span className="text-[9.5px] text-cyan-400 block mt-0.5">{isHindi ? 'काफिला M-17 द्वारा प्रेषित' : 'Target: Mission M-17'}</span>
              </div>
              <div className="bg-[#0f172a] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isHindi ? 'खाद्य सामग्री (Food Rations):' : 'Food Rations:'}</span>
                <strong className="text-amber-400 font-bold">-8% Deficit</strong>
                <span className="text-[9.5px] text-slate-400 block mt-0.5">{isHindi ? 'राहत शिविर S-04 बफर' : 'Shelter S-04 Stock'}</span>
              </div>
              <div className="bg-[#0f172a] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isHindi ? 'स्वच्छ पेयजल (Water):' : 'Clean Water:'}</span>
                <strong className="text-rose-400 font-bold">-24% Critical</strong>
                <span className="text-[9.5px] text-slate-400 block mt-0.5">{isHindi ? 'जल शुद्धिकरण यूनिट सक्रिय' : 'Purifier Units Req'}</span>
              </div>
              <div className="bg-[#0f172a] p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{isHindi ? 'आपातकालीन निर्माण सामग्री:' : 'Shelter Materials:'}</span>
                <strong className="text-emerald-400 font-bold">-4% Nominal</strong>
                <span className="text-[9.5px] text-slate-400 block mt-0.5">{isHindi ? 'डिपो D-03 स्टॉक' : 'Depot D-03 Stock'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LOGISTICS BOTTLENECKS */}
      {currentMode === 'LOGISTICS_BOTTLENECKS' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {isHindi ? 'सक्रिय बुनियादी ढांचा अड़चनें एवं जलमग्न पुल' : 'Active Infrastructure Bottlenecks & Hydraulic Scour'}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onInjectDisruption('bridge_b07', 'FAILED')}
                className="text-[11px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 px-2.5 py-1 rounded-md font-bold transition-colors"
              >
                {t.bridgeDisrupt}
              </button>
              <button
                onClick={() => onInjectDisruption('bridge_b07', 'OPERATIONAL')}
                className="text-[11px] bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 px-2.5 py-1 rounded-md font-bold transition-colors"
              >
                {t.clearDisrupt}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {bottlenecks.map((b) => (
              <div
                key={b.id}
                className="bg-[var(--rd-panel)] border border-[var(--rd-border)] rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {isHindi && b.name.includes('Saraighat') ? 'सरायघाट पुल B-07 (ब्रह्मपुत्र नदी क्रॉसिंग)' : b.name}
                      </span>
                      <PravahDataBadge type={b.data_classification || 'REAL'} lang={lang} />
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                        {b.highway}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-mono mt-0.5 block flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      {isHindi ? 'जोखिम प्रवृत्ति: LOW → RISING → CRITICAL (जलमग्न)' : `${b.type} — ${b.status} (Trend: RISING)`}
                    </span>
                  </div>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded border font-mono ${
                      b.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : 'bg-amber-950 text-amber-300 border-amber-600'
                    }`}
                  >
                    {b.severity}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#070b12] p-2.5 rounded-lg border border-slate-800 font-mono">
                  {b.water_depth_m !== undefined && (
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'जल स्तर / सीमा:' : 'Water / Limit:'}</span>
                      <strong className="text-rose-400 font-bold">{b.water_depth_m}m / {b.threshold_m}m</strong>
                    </div>
                  )}
                  {b.congestion_pct !== undefined && (
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'ट्रैफिक जाम:' : 'Congestion:'}</span>
                      <strong className="text-amber-400 font-bold">{b.congestion_pct}% Gridlock</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'प्रभावित मार्ग:' : 'Corridor:'}</span>
                    <strong className="text-slate-200">{b.affected_route}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'जोखिम में मिशन:' : 'Mission:'}</span>
                    <strong className="text-cyan-300">{b.affected_mission}</strong>
                  </div>
                </div>

                {b.recommended_detour && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>
                      {isHindi ? 'सुरक्षित वैकल्पिक बाईपास:' : 'Safe Alternate Detour:'}{' '}
                      <strong className="text-emerald-200">{b.recommended_detour}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: EMERGENCY ROUTES & ROUTE COMPARISON MATRIX */}
      {currentMode === 'EMERGENCY_ROUTES' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" />
              {isHindi ? 'सक्रिय सड़क गलियारे, ETA एवं विलंब विश्लेषण' : 'Dynamic Route Accessibility & Delay Delta Analysis'}
            </h3>
            <PravahDataBadge type="DERIVED" lang={lang} />
          </div>

          {/* Comprehensive Route Comparison Table (PS Requirement C) */}
          <div className="overflow-x-auto bg-[#070b12] border border-slate-800 rounded-xl p-3">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10.5px]">
                  <th className="pb-2">{isHindi ? 'गलियारा (Route)' : 'Route'}</th>
                  <th className="pb-2 text-right">{isHindi ? 'मूल ETA' : 'Baseline'}</th>
                  <th className="pb-2 text-right">{isHindi ? 'वर्तमान ETA' : 'Current'}</th>
                  <th className="pb-2 text-right">{isHindi ? 'विलंब (Delay)' : 'Delay'}</th>
                  <th className="pb-2">{isHindi ? 'जोखिम (Risk)' : 'Risk'}</th>
                  <th className="pb-2">{isHindi ? 'सुलभता (Feasible)' : 'Feasibility'}</th>
                  <th className="pb-2">{isHindi ? 'मिशन परिणाम (Result)' : 'Mission Result'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                <tr>
                  <td className="py-2.5 font-bold text-cyan-300">Route R-12 (NH-27 Express)</td>
                  <td className="py-2.5 text-right text-emerald-400">15 min</td>
                  <td className="py-2.5 text-right text-rose-400 font-bold">35 min</td>
                  <td className="py-2.5 text-right text-rose-400 font-bold">+20 min</td>
                  <td className="py-2.5"><span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-700">HIGH (TTI 0m)</span></td>
                  <td className="py-2.5 text-rose-400 font-bold">BLOCKED</td>
                  <td className="py-2.5 text-rose-300">{isHindi ? 'पुल जलमग्न — सीमा पार' : 'Misses 45m deadline'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-emerald-300">Route R-14 (Safe South Bypass)</td>
                  <td className="py-2.5 text-right text-emerald-400">35 min</td>
                  <td className="py-2.5 text-right text-emerald-400 font-bold">35 min</td>
                  <td className="py-2.5 text-right text-emerald-400 font-bold">0 min</td>
                  <td className="py-2.5"><span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">SAFE (TTI 340m)</span></td>
                  <td className="py-2.5 text-emerald-400 font-bold">VERIFIED</td>
                  <td className="py-2.5 text-emerald-300">{isHindi ? 'समय पर डिलीवरी (35m < 45m)' : 'Meets 45m deadline'}</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-400">Route R-19 (Mountain Cutoff)</td>
                  <td className="py-2.5 text-right text-slate-400">41 min</td>
                  <td className="py-2.5 text-right text-amber-400">47 min</td>
                  <td className="py-2.5 text-right text-amber-400">+6 min</td>
                  <td className="py-2.5"><span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-700">CRITICAL (Landslide)</span></td>
                  <td className="py-2.5 text-rose-400 font-bold">REJECTED</td>
                  <td className="py-2.5 text-slate-400">{isHindi ? 'सुरक्षा गेट द्वारा निरस्त' : 'Rejected by Safety Gate'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: DELIVERY STATUS & CONVOY M-17 TRACKING */}
      {currentMode === 'DELIVERY_STATUS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-400" />
              {isHindi ? 'सक्रिय काफिला M-17 ट्रैकिंग एवं डिलीवरी समय-सीमा' : 'Active Fleet Telemetry & Mission Tracking'}
            </h3>
            <PravahDataBadge type="REAL" lang={lang} />
          </div>

          <div className="space-y-2.5">
            {missions.map((m) => (
              <div
                key={m.id}
                className="bg-[var(--rd-panel)] border border-[var(--rd-border)] rounded-xl p-3.5 space-y-2.5 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {isHindi && m.name.includes('Convoy M-17') ? 'काफिला M-17: आपातकालीन वैक्सीन एवं ब्लड प्लाज्मा' : m.name}
                      </span>
                      <PravahDataBadge type={m.data_classification || 'REAL'} lang={lang} />
                      <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.2 rounded">
                        {m.priority}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-sans">
                      {isHindi
                        ? `गंतव्य: ${m.destination} · कमोडिटी: ${m.commodity} (${m.quantity_units ?? m.quantity ?? 100} यूनिट्स)`
                        : `${m.origin} ──▶ ${m.destination} (${m.commodity}, ${m.quantity_units ?? m.quantity ?? 100} units)`}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      m.status === 'EN_ROUTE_SAFE' || m.status === 'COMPLETED' || m.status === 'ON_SCHEDULE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : m.status === 'REROUTED'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}
                  >
                    {isHindi
                      ? (m.status === 'EN_ROUTE_SAFE' || m.status === 'ON_SCHEDULE' ? 'मार्ग में (सुरक्षित)' : m.status === 'REROUTED' ? 'पुनः मार्गित (REROUTED)' : 'जोखिम में (AT RISK)')
                      : m.status.replace('_', ' ')}
                  </span>
                </div>

                {(() => {
                  const currentEta = m.current_eta_minutes ?? m.current_eta_min ?? 15;
                  const deadline = m.deadline_minutes ?? m.deadline_min ?? 45;
                  const vehicle = m.vehicle_id ?? m.assigned_vehicle_id ?? 'Reefer Van V-02';
                  const buffer = Math.max(0, deadline - currentEta);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#070b12] p-2.5 rounded-lg border border-slate-800 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'वर्तमान ETA:' : 'Current ETA:'}</span>
                        <strong className="text-cyan-300 font-bold">{currentEta} min</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'समय-सीमा:' : 'Deadline:'}</span>
                        <strong className="text-rose-400 font-bold">{deadline} min limit</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'सक्रिय वाहन:' : 'Vehicle:'}</span>
                        <strong className="text-slate-200 truncate block">{vehicle}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9.5px]">{isHindi ? 'सुरक्षा बफर:' : 'Buffer:'}</span>
                        <strong className="text-emerald-400 font-bold">+{buffer} min Safe</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rd-anim-fade">
          <div className="bg-[var(--rd-surface)] border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                {isHindi ? 'जियो-टैग्ड फील्ड घटना रिपोर्ट दर्ज करें' : 'Submit Geo-Tagged Field Incident Report'}
              </h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono">{isHindi ? 'घटना का प्रकार (Incident Type)' : 'Incident Type'}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-[var(--rd-panel)] border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  <option value="ROAD_BLOCKED">{isHindi ? 'सड़क अवरुद्ध (ROAD BLOCKED)' : 'ROAD BLOCKED'}</option>
                  <option value="BRIDGE_DAMAGE">{isHindi ? 'पुल क्षति / जलमग्न (BRIDGE DAMAGE)' : 'BRIDGE DAMAGE'}</option>
                  <option value="LANDSLIDE">{isHindi ? 'भूस्खलन (LANDSLIDE)' : 'LANDSLIDE'}</option>
                  <option value="FLASH_FLOOD">{isHindi ? 'अचानक बाढ़ (FLASH FLOOD)' : 'FLASH FLOOD'}</option>
                  <option value="CONGESTION">{isHindi ? 'गंभीर ट्रैफिक जाम (CONGESTION)' : 'CONGESTION'}</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{isHindi ? 'स्थान का नाम (Location)' : 'Location'}</label>
                <input
                  type="text"
                  value={formLoc}
                  onChange={(e) => setFormLoc(e.target.value)}
                  className="w-full bg-[var(--rd-panel)] border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{isHindi ? 'गंभीरता (Severity)' : 'Severity'}</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="w-full bg-[var(--rd-panel)] border border-slate-700 rounded-lg p-2 text-white font-mono"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-mono">{isHindi ? 'रिपोर्टर (Officer)' : 'Officer'}</label>
                  <input
                    type="text"
                    value={formOfficer}
                    onChange={(e) => setFormOfficer(e.target.value)}
                    className="w-full bg-[var(--rd-panel)] border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">{isHindi ? 'विवरण (Description)' : 'Description'}</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder={isHindi ? 'घटना की स्थिति और सड़क की स्थिति का विवरण दर्ज करें…' : 'Describe the obstruction, water depth, and passability...'}
                  rows={3}
                  className="w-full bg-[var(--rd-panel)] border border-slate-700 rounded-lg p-2 text-white font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  {isHindi ? 'दर्ज करें (Submit Report)' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
