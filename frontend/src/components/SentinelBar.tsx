import React from 'react';
import { Eye, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { TRANSLATIONS, type Language } from '../i18n';

interface SentinelBarProps {
  status?: string; // MONITORING | VALID | INVALIDATED | REPLANNING
  replanCount?: number;
  version?: number;
  authorized?: boolean;
  replanning?: boolean;
  lang?: Language;
}

export const SentinelBar: React.FC<SentinelBarProps> = ({
  status = 'MONITORING',
  replanCount = 0,
  version = 1,
  authorized = false,
  replanning = false,
  lang = 'en',
}) => {
  const t = TRANSLATIONS[lang];
  const state = replanning
    ? 'REPLANNING'
    : (status || 'MONITORING').toUpperCase();

  const isHindi = lang === 'hi';

  const config = {
    REPLANNING: {
      tone: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.14)',
      icon: RefreshCw,
      title: isHindi ? 'भौतिक वास्तविकता बदली — सीमाओं का पुनर्मूल्यांकन' : 'Reality changed — replanning',
      body: isHindi ? 'जमीनी हालात बदलने के कारण पिछला आदेश अमान्य हुआ। नई अनुपालक योजना बनाई जा रही है।' : 'The previous plan is no longer valid. Generating a new compliant recommendation.',
      spin: true,
    },
    INVALIDATED: {
      tone: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.14)',
      icon: AlertTriangle,
      title: isHindi ? 'योजना अमान्य घोषित' : 'Plan invalidated',
      body: isHindi ? 'वास्तविकता में बदलाव ने अंतर्निहित मान्यता को तोड़ा। नया निर्णय आवश्यक है।' : 'A change in physical reality broke a key assumption. A new decision is required.',
      spin: false,
    },
    VALID: {
      tone: '#10b981',
      bg: 'rgba(16, 185, 129, 0.14)',
      icon: ShieldCheck,
      title: authorized
        ? (isHindi ? 'आदेश विधिवत अधिकृत — प्रहरी (Sentinel) निगरानी सक्रिय' : 'Plan authorized — Sentinel active')
        : (isHindi ? 'योजना मान्य — प्रहरी निगरानी सक्रिय' : 'Plan valid — Sentinel active'),
      body: isHindi ? 'भौतिक सीमाओं एवं स्वीकृत आदेशों की निरंतर 1 Hz टेलीमेट्री द्वारा सत्यता जांच जारी है।' : 'Continuously checking whether this recommendation still holds.',
      spin: false,
    },
    MONITORING: {
      tone: '#10b981',
      bg: 'rgba(16, 185, 129, 0.14)',
      icon: Eye,
      title: isHindi ? 'सतत प्रहरी निगरानी प्रणाली (Sentinel Watchdog)' : 'Sentinel monitoring reality',
      body: isHindi ? 'भौतिक सीमाओं एवं स्वीकृत आदेशों की निरंतर 1 Hz टेलीमेट्री द्वारा सत्यता जांच जारी है।' : 'Continuously checking whether the current recommendation remains valid.',
      spin: false,
    },
  }[state] || {
    tone: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)',
    icon: Eye,
    title: isHindi ? 'सतत प्रहरी निगरानी प्रणाली (Sentinel Watchdog)' : 'Sentinel monitoring reality',
    body: isHindi ? 'भौतिक सीमाओं एवं स्वीकृत आदेशों की निरंतर 1 Hz टेलीमेट्री द्वारा सत्यता जांच जारी है।' : 'Continuously checking whether the current recommendation remains valid.',
    spin: false,
  };

  const Icon = config.icon;

  return (
    <div
      className="rd-panel flex items-center gap-4 px-5 py-3.5 bg-[var(--rd-surface)] border rounded-xl shadow-lg transition-all"
      style={{ borderColor: config.tone === '#10b981' ? 'var(--rd-border)' : config.tone }}
    >
      <div
        className="flex items-center justify-center rounded-xl shrink-0 border"
        style={{ width: 40, height: 40, background: config.bg, color: config.tone, borderColor: `${config.tone}44` }}
      >
        <Icon className={`w-5 h-5 ${config.spin ? 'animate-spin' : ''}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="t-h3 text-white font-bold">{config.title}</span>
          {!replanning && state !== 'INVALIDATED' && (
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.tone }} />
          )}
        </div>
        <div className="t-caption mt-0.5 text-slate-300 truncate">{config.body}</div>
      </div>
      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-right">
          <div className="t-label text-slate-400 font-bold">{t.sentinelReality}</div>
          <div className="text-xs font-mono font-bold mt-0.5 text-cyan-300">v{version}</div>
        </div>
        <div className="text-right">
          <div className="t-label text-slate-400 font-bold">{t.sentinelReplans}</div>
          <div className="text-xs font-mono font-bold mt-0.5 text-amber-300">{replanCount}</div>
        </div>
      </div>
    </div>
  );
};
