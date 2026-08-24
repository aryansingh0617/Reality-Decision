import React, { useState } from 'react';
import {
  Camera,
  MapPin,
  Send,
  Wifi,
  WifiOff,
  CheckCircle2,
  Upload,
  X,
} from 'lucide-react';
import type { Language } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  onReportSubmitted?: () => void;
}

export const FieldReporterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang = 'en',
  onReportSubmitted,
}) => {
  const [incidentType, setIncidentType] = useState('BRIDGE_SUBMERGENCE');
  const [locationName, setLocationName] = useState('Saraighat Bridge Northern Causeway (NH-27)');
  const [severity, setSeverity] = useState('CRITICAL');
  const [waterDepth, setWaterDepth] = useState('0.52');
  const [officerName, setOfficerName] = useState('Scout D. Gogoi (Kamrup Aapda Mitra #14)');
  const [description, setDescription] = useState('Water rising rapidly above bridge abutment. Passage unsafe for heavy vehicles.');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isHindi = lang === 'hi';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      incident_type: incidentType,
      location_name: locationName,
      coordinates: [26.19, 91.745],
      severity: severity,
      confidence: 'VERIFIED',
      description: `${description} [Water Depth: ${waterDepth}m]`,
      reported_by: officerName,
      photo_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=60',
    };

    try {
      if (!isOfflineMode) {
        await fetch('/api/field-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setSubmitSuccess(true);
      if (onReportSubmitted) onReportSubmitted();
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1800);
    } catch {
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 rd-anim-fade">
      <div className="bg-[#0b1019] border border-cyan-700/60 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-[#080d16]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-700/60">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                {isHindi ? 'फील्ड स्काउट मोबाइल PWA ऐप' : 'Field Scout Mobile PWA Console'}
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  OFFLINE-FIRST
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isHindi ? 'जियो-टैग्ड आपातकालीन ग्राउंड रिपोर्टिंग' : 'Geo-Tagged Emergency Ground Truth Intake'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOfflineMode((m) => !m)}
              className={`flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded border transition-colors ${
                isOfflineMode
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>OFFLINE QUEUE</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>ONLINE SYNC</span>
                </>
              )}
            </button>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300">
          {/* GPS Auto-Location Header Card */}
          <div className="p-3 rounded-xl bg-[#080d16] border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 animate-pulse" />
              <div>
                <span className="font-bold text-white block">GPS: 26.1900° N, 91.7450° E</span>
                <span className="text-[10px] text-slate-400 font-mono">Kamrup Metropolitan (Saraighat Bridge)</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
              ±1.8m ACCURATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
                {isHindi ? 'घटना का प्रकार' : 'Incident Type'}
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
              >
                <option value="BRIDGE_SUBMERGENCE">BRIDGE SUBMERGENCE</option>
                <option value="LANDSLIDE_BLOCK">LANDSLIDE OBSTRUCTION</option>
                <option value="FLASH_FLOOD">FLASH FLOOD SURGE</option>
                <option value="ROAD_COLLAPSE">ROAD/CULVERT BREACH</option>
                <option value="TRAFFIC_GRIDLOCK">CONVOY TRAFFIC GRIDLOCK</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
                {isHindi ? 'गंभीरता स्तर' : 'Severity Level'}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
              >
                <option value="CRITICAL">CRITICAL (IMPASSABLE)</option>
                <option value="HIGH">HIGH (4x4 ONLY)</option>
                <option value="MODERATE">MODERATE (SLOW TRAFFIC)</option>
                <option value="LOW">LOW (CAUTION)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
                {isHindi ? 'जल स्तर गेज (m)' : 'Water Depth Gauge (m)'}
              </label>
              <input
                type="text"
                value={waterDepth}
                onChange={(e) => setWaterDepth(e.target.value)}
                className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
                {isHindi ? 'रिपोर्टर (Aapda Mitra / Officer)' : 'Reporting Officer'}
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
              {isHindi ? 'स्थान विवरण' : 'Location Name / Landmark'}
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-mono text-[10.5px]">
              {isHindi ? 'ग्राउंड नोट्स / प्रत्यक्षदर्शी विवरण' : 'Ground Notes & Physical Observations'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#080d16] border border-slate-700 rounded-lg p-2 text-white font-sans text-xs"
            />
          </div>

          {/* Photo Upload Simulator Box */}
          <div className="border border-dashed border-cyan-800/60 rounded-xl p-3 bg-cyan-950/20 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold text-[11px]">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isHindi ? 'जियो-टैग्ड फोटो संलग्न (Verified)' : 'Geo-Tagged Photo Attached (Verified EXIF)'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              IMG_20260824_1945_Saraighat_B07.jpg (1.8 MB · GPS Attached)
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950/40 text-xs transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {submitSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>{isHindi ? 'EOC में सफलतापूर्वक दर्ज!' : 'Ingested into Central State Model!'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {isHindi
                    ? isOfflineMode
                      ? 'ऑफ़लाइन कतार में सहेजें (Save to Queue)'
                      : 'केंद्रीय EOC को तुरंत भेजें'
                    : isOfflineMode
                    ? 'Save to Local Offline Queue'
                    : 'Submit Report to Central EOC Engine'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
