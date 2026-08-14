import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CinematicOpeningProps {
  onDismiss: () => void;
}

export const CinematicOpening: React.FC<CinematicOpeningProps> = ({ onDismiss }) => {
  const [visible, setVisible] = useState(true);

  const getISTTime = () => {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);
    return `${timeStr} IST`;
  };

  const [timeStr, setTimeStr] = useState(getISTTime);

  useEffect(() => {
    const updateTime = () => setTimeStr(getISTTime());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#0a0d0f] min-h-[100svh] w-screen flex flex-col items-center justify-center text-center font-mono select-none cursor-pointer overflow-hidden p-6"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 4.2, duration: 1.0, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        setVisible(false);
        onDismiss();
      }}
      onClick={() => {
        setVisible(false);
        onDismiss();
      }}
    >
      {visible && (
        <div className="max-w-2xl w-full flex flex-col items-center justify-center my-auto transform -translate-y-2">
          {/* 1. Operational Telemetry Block */}
          <motion.div
            className="w-full flex flex-col items-center space-y-1.5 mb-6 text-xs text-[#8a9aaa]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="text-[10px] text-[#5a6a7a] tracking-[0.25em] uppercase font-bold border-b border-[#242a2e] pb-2 mb-2 w-full max-w-sm">
              {timeStr} // OPERATIONAL TELEMETRY
            </div>
            
            <div className="flex items-center justify-center gap-4 text-[11px] font-mono flex-wrap">
              <span>ENV: <span className="text-[#f39c12] font-bold">UNSTABLE</span></span>
              <span className="text-[#242a2e]">│</span>
              <span>STREAMS: <span className="text-[#e8edf2] font-bold">07</span></span>
              <span className="text-[#242a2e]">│</span>
              <span>ENTITIES: <span className="text-[#e8edf2] font-bold">18</span></span>
              <span className="text-[#242a2e]">│</span>
              <span>EDGES: <span className="text-[#e8edf2] font-bold">31</span></span>
              <span className="text-[#242a2e]">│</span>
              <span>VARIABLES: <span className="text-[#f39c12] font-bold">04</span></span>
            </div>
          </motion.div>

          {/* 2. Dominant Title & Subtitle Stack */}
          <motion.div
            className="flex flex-col items-center justify-center w-full"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 1.2,
              type: 'spring' as const,
              stiffness: 100,
              damping: 22,
              mass: 0.8,
            }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-[0.22em] text-[#e8edf2] uppercase font-mono my-0 leading-none">
              REALITY//DECISION
            </h1>
            
            <p className="text-[#f5c86e] tracking-[0.16em] text-xs sm:text-sm uppercase max-w-xl font-mono leading-relaxed mt-4 mb-2 font-bold">
              WHEN REALITY CHANGES, THE PLAN MUST CHANGE WITH IT.
            </p>
            <p className="text-[#8a9aaa] tracking-[0.12em] text-[11px] uppercase max-w-lg font-mono leading-normal">
              Autonomous AI decision-support platform that observes changing conditions, investigates consequences, and adapts plans under human authorization.
            </p>
          </motion.div>

          {/* 3. Bottom Initializing Status Bar */}
          <motion.div
            className="mt-10 text-[#5a6a7a] text-[10px] tracking-[0.22em] uppercase flex items-center justify-center gap-2 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.5 }}
          >
            <span>INITIALIZING INTELLIGENCE CORRIDOR</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.0, repeat: Infinity }}
              className="text-[#2ecc71]"
            >
              ●
            </motion.span>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
