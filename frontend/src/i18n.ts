export type Language = 'en' | 'hi';

export const TRANSLATIONS = {
  en: {
    // Header & Brand
    appName: 'PRAVAH',
    psTag: 'PS 26002',
    appSubtitle: 'AI-Based Smart Logistics and Accessibility Intelligence Platform — North Eastern Region (NER)',
    pilotBadge: 'PILOT: KAMRUP METRO / GUWAHATI NH-27',
    coreLoop: 'PREDICT → UNDERSTAND → DECIDE → REPLAN',
    howItWorks: 'Operational Manual',
    verifyAutonomy: 'Verify Autonomy Harness',
    simulateOutage: 'Simulate Model Outage',
    outageOn: 'Outage Active: Deterministic Safe Mode',
    narration: 'Voice Narration',
    voiceOn: 'Voice Active',
    muted: 'Muted',
    langSelect: 'Language Selection',
    voiceSelect: 'Voice Engine',
    voiceOver: 'Audio Synthesis',

    // Navigation Tabs
    navCommand: 'Incident Command Center',
    navDecision: 'Executive Decision Packet',
    navActivity: 'Agent Audit Trace',
    navMap: 'Spatial GIS Vector Grid',
    navAnalysis: 'Analysis & Provenance Audit',

    // PS 26002 Dashboard Modes
    tabDistricts: 'District Connectivity Grid',
    tabBottlenecks: 'Infrastructure Bottlenecks',
    tabRoutes: 'Emergency Corridors & ETAs',
    tabMissions: 'Live Mission Delivery Status',
    submitReport: 'File Geo-Tagged Incident Report',
    connectors: 'Authoritative Ingestion Adapters',
    onlineStatus: 'ONLINE / LIVE TELEMETRY SYNC',
    offlineStatus: 'OFFLINE MODE (LOCAL QUEUE)',
    disruptSimulation: 'Inject Physical Reality Disruption',
    bridgeDisrupt: 'Simulate: Saraighat Bridge B-07 Submerged (0.52m)',
    clearDisrupt: 'Restore: Saraighat Bridge B-07 Operational',

    // Command Center Hero
    currentSituation: 'Authoritative Operational Reality',
    runDecisionCycle: 'Execute Autonomous Decision Cycle',
    runningCycle: 'Investigating Physical State & Computing Optimal Replan…',
    simulateBridgeFail: 'Simulate: Bridge B-07 Hydraulic Breach',
    guidedDemo: 'Play 60-Second Guided Defense Briefing',
    stopDemo: 'Terminate Briefing',
    guidedDemoStep: 'Operational Briefing · Phase',
    of: 'of',

    // Metrics
    metricWaterLevel: 'Water Elevation (Depth)',
    metricRiseRate: 'Surge Inundation Rate',
    metricTimeToImpact: 'Time to Invalidation (TTI)',
    metricPlanStatus: 'Statutory Authorization Status',
    statusAuthorized: 'AUTHORIZED & BINDING',
    statusAwaiting: 'AWAITING COMMAND SIGN-OFF',
    statusNone: 'NO ACTIVE ORDER',

    // Map & Network
    mapOperational: 'Operational GIS',
    mapNetwork: 'Dependency Graph',

    // Sentinel Watchdog
    sentinelTitle: 'Sentinel Continuous Monitoring Watchdog',
    sentinelDesc: 'Real-time telemetry verification checking physical invariants against authorized orders.',
    sentinelReality: 'STATE VERSION',
    sentinelReplans: 'CYCLE COUNT',
    sentinelReplanningTitle: 'Physical Reality Mutated — Re-evaluating Bounds',
    sentinelReplanningDesc: 'Prior authorization invalidated by physical state shift. Generating compliant replan.',

    // Reality Timeline
    timelineTitle: 'Chronological Audit Timeline',
    timelineSubtitle: 'Immutable replay of physical state transitions, autonomous replans, and authorizations',
    timelineReplayBtn: 'Replay State Progression',
    timelineReplayStop: 'Halt Replay',
    timelineStatesCount: 'Recorded State Snapshots',
    timelineAtReality: 'RECORDED AT STATE',
    timelineRec: 'STATUTORY RECOMMENDATION',
    timelineRoute: 'ASSIGNED CORRIDOR',
    timelineConfidence: 'CONFIDENCE FACTOR',
    timelineStatus: 'AUTHORIZATION STAMP',
    timelineWhyChanged: 'TRIGGERING PHYSICAL CAUSE & IMPACT PROPAGATION',

    // Counterfactual Futures
    counterfactualTitle: 'Counterfactual Stress-Testing & Branching Analysis',
    counterfactualSubtitle: 'Exhaustive combinatorial simulation across degradation vectors and deadline constraints',
    counterfactualSimCount: 'Evaluated Physical Branches',
    counterfactualSimCond: 'SIMULATED CORRIDOR TRAJECTORIES',
    counterfactualOutcome: 'DETAILED CASUALTY & SUPPLY BUFFER IMPACT',
    counterfactualStressScore: 'SYSTEMIC RISK SCORE',
    counterfactualTargetRoute: 'EVALUATED ROUTE',
    counterfactualEstDelay: 'ESTIMATED BOTTLENECK DELAY',
    counterfactualStatus: 'PHYSICAL FEASIBILITY',
    counterfactualDecWindow: 'OPERATIONAL DECISION WINDOW',
    counterfactualSimOutcome: 'SIMULATED TRAJECTORY SUMMARY',

    // Decision Packet
    currentRecommendation: 'Statutory Autonomous Recommendation',
    decisionReady: 'Formal Decision Packet Staged for Incident Commander Authorization',
    recommendationTitle: 'Recommended Tactical Directive',
    estimatedDelay: 'Estimated Transit Delay',
    transitTime: 'Transit ETA',
    timeSaved: 'Safety Margin vs Physical Hazard',
    fragilityRating: 'Trajectory Stability Index',
    whyThisRoute: 'Operational Legal & Physical Rationale',
    criticalAssumption: 'Critical Underlying Assumption (Rebuttable)',
    consequenceIfWrong: 'Worst-Case Consequence if Reality Violates Assumption',
    alternativeOptions: 'Evaluated Counterfactual Candidates',
    evidenceProvenance: 'Sensory Evidence Provenance & Cryptographic Audit',
    humanCommanderGate: 'Incident Commander Statutory Gate (Disaster Management Act)',
    authorizePlan: 'Sign & Issue Binding Authorization',
    authorizing: 'Committing Version-Locked Authorization…',
    rejectPlan: 'Formally Reject Directive',
    requestVerify: 'Deploy Recon Drone (VoI Verification)',
    versionLockLabel: 'Version-Locked State Guarantee',
    staleRejectedNotice: 'STALE AUTHORIZATION INTERCEPTED: Physical reality shifted prior to execution signature. Stale order blocked; automated replan triggered.',
    authorizedNotice: 'DIRECTIVE FORMALLY AUTHORIZED: Executable order dispatched. Continuous Sentinel active.',

    // Stepper
    stepIngest: 'Data Ingestion',
    stepEvidence: 'Evidence & VoI',
    stepDependency: 'Causal Cascade',
    stepSimulation: 'Counterfactuals',
    stepSafetyGate: 'Deterministic Safety Gate',
    stepPacket: 'Decision Packet',
    stepAuthorization: 'Human Commander Sign-Off',
    stepSentinel: 'Sentinel Watchdog',

    // Agent Activity & Trace
    agentActivityTitle: 'Autonomous ReAct Reasoning Trace',
    unscriptedBadge: 'MULTI-TURN ReAct TOOL REGISTRY EXECUTION',
    toolCallsCount: 'Executed Tools',
    avgLatency: 'Mean Ingestion Latency',
    tokenUsage: 'Ingested Context Tokens',
    noActivityYet: 'No reasoning cycles recorded. Trigger a decision cycle above.',

    // Analysis Tabs
    tabCounterfactuals: 'Counterfactual Futures Simulation',
    tabDependencyGraph: 'Causal Infrastructure Graph',
    tabW3CProv: 'W3C PROV-O Provenance Graph',

    // Data Badges
    badgeReal: 'REAL',
    badgeSimulated: 'SIMULATED',
    badgePredicted: 'PREDICTED',
    badgeDerived: 'DERIVED',

    // Field Report Form
    fieldReportTitle: 'Statutory Geo-Tagged Incident Declaration',
    incidentType: 'Incident Classification',
    locationName: 'Designated Corridor / Landmark',
    severity: 'Severity Tier',
    description: 'Field Observer Sworn Narrative',
    descPlaceholder: 'Record ground observations, water depth, physical vehicle wading constraints, structural scour...',
    cancel: 'Cancel',
    submit: 'File Official Incident Report',

    // Toast & Alerts
    engineUnreachable: 'Central Reasoning Engine unreachable. Local fail-safe state cached.',
    dismiss: 'Acknowledge',
  },
  hi: {
    // Header & Brand (वैधानिक शासकीय प्रारूप)
    appName: 'प्रवाह (PRAVAH)',
    psTag: 'समस्या विवरण 26002',
    appSubtitle: 'पूर्वोत्तर क्षेत्र (NER) हेतु AI-आधारित स्मार्ट लॉजिस्टिक्स एवं पहुंच आसूचना मंच — आपदा प्रबंधन प्रभाग',
    pilotBadge: 'पायलट गलियारा: कामरूप महानगर / गुवाहाटी NH-27',
    coreLoop: 'पूर्वानुमान → समझ → निर्णय → पुनर्योजना',
    howItWorks: 'परिचालन नियमावली एवं कार्यप्रणाली',
    verifyAutonomy: 'स्वायत्तता परीक्षण सूट (Autonomy Harness)',
    simulateOutage: 'AI मॉडल आउटेज सिमुलेट करें',
    outageOn: 'आउटेज सक्रिय: सुरक्षित फ़ॉलबैक मोड',
    narration: 'ध्वनि उद्घोषणा (Voice Narration)',
    voiceOn: 'ध्वनि सक्रिय',
    muted: 'मूक (Muted)',
    langSelect: 'भाषा चयन',
    voiceSelect: 'ध्वनि इंजन',
    voiceOver: 'ऑडियो संश्लेषण',

    // Navigation Tabs
    navCommand: 'आपदा नियंत्रण एवं कमान केंद्र',
    navDecision: 'कार्यकारी निर्णय पैकेट (Decision Packet)',
    navActivity: 'स्वायत्त एजेंट ऑडिट ट्रेस',
    navMap: 'स्थानिक GIS वेक्टर मानचित्र',
    navAnalysis: 'विश्लेषण एवं W3C प्रमाणिकता ऑडिट',

    // PS 26002 Dashboard Modes
    tabDistricts: 'जिलावार कनेक्टिविटी एवं पहुंच ग्रिड',
    tabBottlenecks: 'बुनियादी ढांचा अड़चनें एवं बाढ़',
    tabRoutes: 'आपातकालीन गलियारे एवं ETA विश्लेषण',
    tabMissions: 'सक्रिय आपूर्ति मिशन एवं डिलीवरी स्थिति',
    submitReport: 'जियो-टैग्ड घटना रिपोर्ट दर्ज करें',
    connectors: 'प्राधिकृत डेटा एडेप्टर एवं लाइव फ़ीड्स',
    onlineStatus: 'ऑनलाइन / लाइव टेलीमेट्री सिंक सक्रिय',
    offlineStatus: 'ऑफ़लाइन मोड (स्थानीय कतार)',
    disruptSimulation: 'भौतिक व्यवधान इंजेक्ट करें',
    bridgeDisrupt: 'सिमुलेट: सरायघाट पुल B-07 जलमग्न (0.52m)',
    clearDisrupt: 'पुनर्स्थापित: सरायघाट पुल B-07 चालू करें',

    // Command Center Hero
    currentSituation: 'प्राधिकृत परिचालन वास्तविकता (Authoritative Reality)',
    runDecisionCycle: 'स्वायत्त निर्णय चक्र निष्पादित करें',
    runningCycle: 'जमीनी हालात का निरीक्षण एवं इष्टतम पुनर्योजना की गणना जारी…',
    simulateBridgeFail: 'सिमुलेट: सरायघाट पुल B-07 जलभराव विफलता',
    guidedDemo: '60-सेकंड गाइडेड रक्षा ब्रीफिंग देखें',
    stopDemo: 'ब्रीफिंग समाप्त करें',
    guidedDemoStep: 'परिचालन ब्रीफिंग · चरण',
    of: 'का',

    // Metrics
    metricWaterLevel: 'जल स्तर / गहराई (Water Depth)',
    metricRiseRate: 'जलभराव वृद्धि दर (Rise Rate)',
    metricTimeToImpact: 'अमान्यता तक का समय (TTI)',
    metricPlanStatus: 'वैधानिक प्राधिकरण स्थिति (Status)',
    statusAuthorized: 'स्वीकृत एवं वैधानिक रूप से सक्रिय (Authorized)',
    statusAwaiting: 'कमांडर हस्ताक्षर प्रतीक्षित (Pending Sign-Off)',
    statusNone: 'कोई आदेश सक्रिय नहीं',

    // Map & Network
    mapOperational: 'स्थानिक GIS मानचित्र',
    mapNetwork: 'निर्भरता नेटवर्क',

    // Sentinel Watchdog
    sentinelTitle: 'सतत प्रहरी निगरानी प्रणाली (Sentinel Watchdog)',
    sentinelDesc: 'भौतिक सीमाओं एवं स्वीकृत आदेशों की निरंतर 1 Hz टेलीमेट्री द्वारा सत्यता जांच।',
    sentinelReality: 'विश्व स्थिति संस्करण',
    sentinelReplans: 'पुनर्योजना गणना',
    sentinelReplanningTitle: 'भौतिक वास्तविकता बदली — सीमाओं का पुनः मूल्यांकन',
    sentinelReplanningDesc: 'जमीनी हालात बदलने के कारण पिछला आदेश अमान्य हुआ। नई अनुपालक योजना बनाई जा रही है।',

    // Reality Timeline
    timelineTitle: 'कालानुक्रमिक परिचालन ऑडिट टाइमलाइन',
    timelineSubtitle: 'भौतिक स्थिति बदलावों, स्वायत्त पुनर्योजनाओं और हस्ताक्षरित आदेशों का अपरिवर्तनीय रीप्ले',
    timelineReplayBtn: 'स्थिति अनुक्रम पुनः चलाएं (Replay)',
    timelineReplayStop: 'रीप्ले रोकें',
    timelineStatesCount: 'दर्ज स्थिति स्नैपशॉट',
    timelineAtReality: 'अभिलेखित स्थिति',
    timelineRec: 'वैधानिक अनुशंसा',
    timelineRoute: 'आवंटित गलियारा',
    timelineConfidence: 'विश्वास स्तर',
    timelineStatus: 'प्राधिकरण मोहर',
    timelineWhyChanged: 'भौतिक कारण एवं कैस्केडिंग प्रभाव विवरण',

    // Counterfactual Futures
    counterfactualTitle: 'वैकल्पिक भविष्य सिमुलेशन एवं तनाव परीक्षण (Counterfactual Analysis)',
    counterfactualSubtitle: 'आपदा परिस्थितियों, विलंब और अस्पताल आपूर्ति सीमाओं पर गहन कॉम्बिनेटोरियल सिमुलेशन',
    counterfactualSimCount: 'मूल्यांकित भौतिक शाखाएं',
    counterfactualSimCond: 'सिमुलेटेड गलियारा प्रक्षेपवक्र (Conditions)',
    counterfactualOutcome: 'विस्तृत जनहानि एवं आपूर्ति बफर प्रभाव विश्लेषण',
    counterfactualStressScore: 'प्रणालीगत जोखिम स्कोर',
    counterfactualTargetRoute: 'मूल्यांकित गलियारा',
    counterfactualEstDelay: 'अनुमानित अड़चन विलंब',
    counterfactualStatus: 'भौतिक व्यावहारिकता',
    counterfactualDecWindow: 'परिचालन निर्णय विंडो',
    counterfactualSimOutcome: 'सिमुलेटेड परिणाम सारांश',

    // Decision Packet (वैधानिक प्रारूप)
    currentRecommendation: 'स्वायत्त AI वैधानिक अनुशंसा',
    decisionReady: 'इंसिडेंट कमांडर हस्ताक्षर हेतु औपचारिक निर्णय पैकेट तैयार',
    recommendationTitle: 'अनुशंसित रणनीतिक कार्ययोजना',
    estimatedDelay: 'अनुमानित आवागमन विलंब',
    transitTime: 'यात्रा समय (ETA)',
    timeSaved: 'जोखिम के विरुद्ध सुरक्षा मार्जिन',
    fragilityRating: 'योजना स्थिरता सूचकांक',
    whyThisRoute: 'परिचालन, भौतिक एवं वैधानिक तर्क (Why This Decision)',
    criticalAssumption: 'महत्वपूर्ण अंतर्निहित मान्यता (Critical Assumption)',
    consequenceIfWrong: 'यदि वास्तविकता मान्यता को असत्य सिद्ध करे (Worst-Case Consequence)',
    alternativeOptions: 'मूल्यांकित वैकल्पिक प्रत्याशी मार्ग',
    evidenceProvenance: 'सेंसर साक्ष्य एवं क्रिप्टोग्राफिक स्रोत प्रमाण (W3C PROV-O)',
    humanCommanderGate: 'इंसिडेंट कमांडर वैधानिक गेट (आपदा प्रबंधन अधिनियम)',
    authorizePlan: 'हस्ताक्षर करें एवं बाध्यकारी आदेश जारी करें (Authorize)',
    authorizing: 'संस्करण-लॉक प्राधिकरण दर्ज किया जा रहा है…',
    rejectPlan: 'आदेश औपचारिक रूप से अस्वीकार करें (Reject)',
    requestVerify: 'ड्रोन भेजें (VoI सत्यापन)',
    versionLockLabel: 'विश्व स्थिति संस्करण द्वारा संरक्षित',
    staleRejectedNotice: 'पुराना प्राधिकरण अस्वीकृत: हस्ताक्षर से पूर्व जमीनी वास्तविकता बदल गई। पुराना आदेश निरस्त; तत्काल पुनर्योजना सक्रिय।',
    authorizedNotice: 'आदेश विधिवत स्वीकृत एवं प्रभावी: निष्पादन दल को भेजा गया। सतत प्रहरी सक्रिय।',

    // Stepper
    stepIngest: 'डेटा अंतर्ग्रहण',
    stepEvidence: 'साक्ष्य एवं VoI',
    stepDependency: 'कारणात्मक कैस्केड',
    stepSimulation: 'विकल्प सिमुलेशन',
    stepSafetyGate: 'सुरक्षा गेट सत्यापन',
    stepPacket: 'निर्णय पैकेट',
    stepAuthorization: 'कमांडर हस्ताक्षर',
    stepSentinel: 'प्रहरी निगरानी',

    // Agent Activity & Trace
    agentActivityTitle: 'स्वायत्त ReAct रीज़निंग ऑडिट ट्रेस',
    unscriptedBadge: 'अनरस्क्रिप्टेड मल्टी-टर्न ReAct निष्पादन',
    toolCallsCount: 'निष्पादित टूल्स',
    avgLatency: 'औसत अंतर्ग्रहण विलंबता',
    tokenUsage: 'प्रयुक्त कॉन्टेक्स्ट टोकन',
    noActivityYet: 'कोई रीज़निंग चक्र दर्ज नहीं है। ऊपर निर्णय चक्र चलाएं।',

    // Analysis Tabs
    tabCounterfactuals: 'वैकल्पिक भविष्य सिमुलेशन',
    tabDependencyGraph: 'कारणात्मक बुनियादी ढांचा नेटवर्क',
    tabW3CProv: 'W3C PROV-O डेटा स्रोत ग्राफ',

    // Data Badges
    badgeReal: 'वास्तविक (REAL)',
    badgeSimulated: 'सिमुलेटेड (SIM)',
    badgePredicted: 'पूर्वानुमानित (PRED)',
    badgeDerived: 'व्युत्पन्न (DER)',

    // Field Report Form (वैधानिक प्रारूप)
    fieldReportTitle: 'जियो-टैग्ड वैधानिक घटना रिपोर्ट प्रपत्र',
    incidentType: 'घटना का वैधानिक वर्गीकरण',
    locationName: 'गलियारा / भू-स्थानिक लैंडमार्क',
    severity: 'गंभीरता श्रेणी',
    description: 'फील्ड अधिकारी का शपथपूर्वक अवलोकन',
    descPlaceholder: 'जमीनी हालात, जल स्तर की गहराई, वाहनों की पारगमन क्षमता, संरचनात्मक कटाव दर्ज करें...',
    cancel: 'रद्द करें',
    submit: 'आधिकारिक रिपोर्ट सबमिट करें',

    // Toast & Alerts
    engineUnreachable: 'केंद्रीय रीज़निंग इंजन से संपर्क बाधित। स्थानीय सुरक्षित स्थिति सक्रिय।',
    dismiss: 'अवगत हुए',
  },
};

/**
 * Universal Dynamic Legal Translator: Translates any backend telemetry string,
 * event cause, route description, or assumption into formal official Hindi.
 */
export function translateDynamicText(text: string | null | undefined, lang: Language): string {
  if (!text) return '';
  if (lang === 'en') return text;

  let t = text;

  // Direct matches
  const dict: Record<string, string> = {
    'AUTHORIZED': 'अधिकृत एवं स्वीकृत (AUTHORIZED)',
    'PENDING': 'हस्ताक्षर प्रतीक्षित (PENDING)',
    'STALE_REJECTED': 'पुराना आदेश निरस्त (STALE REJECTED)',
    'REJECTED': 'अस्वीकृत (REJECTED)',
    'HIGH': 'उच्च (HIGH)',
    'MEDIUM': 'मध्यम (MEDIUM)',
    'LOW': 'निम्न (LOW)',
    'CRITICAL': 'अति-गंभीर (CRITICAL)',
    'STABLE': 'स्थिर (STABLE)',
    'FRAGILE': 'संवेदनशील (FRAGILE)',
    'OPERATIONAL': 'चालू / सुगम (OPERATIONAL)',
    'IMPASSABLE': 'अवरुद्ध / जलमग्न (IMPASSABLE)',
    'BLOCKED': 'अवरुद्ध (BLOCKED)',
    'UNAVAILABLE': 'अनुपलब्ध (UNAVAILABLE)',
    'UNCERTAIN': 'अनिश्चित (UNCERTAIN)',
    'SAFE': 'सुरक्षित (SAFE)',
    'ON_SCHEDULE': 'समय पर (ON SCHEDULE)',
    'REROUTED': 'पुनर्निर्देशित (REROUTED)',
    'AT_RISK': 'जोखिम में (AT RISK)',
    'HOLD_AND_SHELTER': 'रोकें एवं आश्रय लें (HOLD & SHELTER)',
    'AUTHORIZE_ROUTE_R12': 'मार्ग R-12 को अधिकृत करें (NH-27 एक्सप्रेस)',
    'AUTHORIZE_ROUTE_R14': 'मार्ग R-14 को अधिकृत करें (NH-6 बाईपास)',
    'ESCALATE': 'राज्य आपदा केंद्र को एस्केलेट करें',
  };

  if (dict[t.trim()]) return dict[t.trim()];

  // Regex and pattern transformations
  t = t.replace(/ROUTE R-12 depends on unresolved bridge_b07/gi, 'मार्ग R-12 सरायघाट पुल B-07 के जलमग्न होने के कारण बंद है।');
  t = t.replace(/ROUTE R-14 remains accessible for current vehicle class/gi, 'मार्ग R-14 वर्तमान वाहन श्रेणी (4.5T रीफर वैन) हेतु 100% सुगम एवं सुरक्षित है।');
  t = t.replace(/Reality Event Ingested:\s*BRIDGE B-07 FAILURE/gi, 'वास्तविक घटना दर्ज: सरायघाट पुल B-07 का जलमग्न होना');
  t = t.replace(/BRIDGE B-07 FAILURE/gi, 'सरायघाट पुल B-07 जलमग्न विफलता');
  t = t.replace(/Estimated delay:\s*(\d+)-(\d+)\s*min/gi, 'अनुमानित विलंब: $1-$2 मिनट');
  t = t.replace(/Exposure:\s*MEDIUM\s*\(synthetic estimate\)/gi, 'जोखिम जोखिम: मध्यम (सिंथेटिक आकलन)');
  t = t.replace(/Exposure:\s*HIGH\s*\(synthetic estimate\)/gi, 'जोखिम जोखिम: उच्च (सिंथेटिक आकलन)');
  t = t.replace(/Exposure:\s*LOW\s*\(synthetic estimate\)/gi, 'जोखिम जोखिम: निम्न (सिंथेटिक आकलन)');
  t = t.replace(/ROUTE R-12\s*—\s*FAST CORRIDOR/gi, 'मार्ग R-12 — तीव्र एक्सप्रेसवे गलियारा');
  t = t.replace(/ROUTE R-14\s*—\s*SAFE BYPASS DETOUR/gi, 'मार्ग R-14 — सुरक्षित बाईपास डायवर्जन');
  t = t.replace(/ROUTE R-14\s*—\s*SAFE BYPASS/gi, 'मार्ग R-14 — सुरक्षित बाईपास गलियारा');
  t = t.replace(/HOLD & SHELTER/gi, 'रोकें एवं राहत आश्रय में सुरक्षित करें');
  t = t.replace(/Mission initialized — monitoring live waterway conditions\./gi, 'मिशन प्रारंभ — ब्रह्मपुत्र जलमार्ग एवं पुलों की लाइव निगरानी सक्रिय।');
  t = t.replace(/Evaluated under stress testing for downstream capacity, weather delay, and evidence confidence\./gi, 'डाउनस्ट्रीम अस्पताल क्षमता, मौसमी विलंब एवं साक्ष्य विश्वास के तहत तनाव-परीक्षण किया गया।');
  t = t.replace(/Direct R-12 Corridor/gi, 'सीधा मार्ग R-12 (NH-27)');
  t = t.replace(/Safe Bypass Detour \(R-14\)/gi, 'सुरक्षित बाईपास डायवर्जन (मार्ग R-14)');
  t = t.replace(/Hold & Verification Wait/gi, 'रोकें एवं ड्रोन सत्यापन प्रतीक्षा');
  t = t.replace(/Feasible < (\d+)m/gi, 'व्यावहारिक < $1 मिनट');
  t = t.replace(/(\d+)% fit/gi, '$1% उपयुक्तता');
  t = t.replace(/\+(\d+)m delay/gi, '+$1 मिनट विलंब');

  return t;
}
