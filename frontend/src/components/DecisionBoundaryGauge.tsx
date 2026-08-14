import React from 'react';
import { motion } from 'framer-motion';

const SPRING = {
  BUTTER: { type: 'spring' as const, stiffness: 100, damping: 20, mass: 0.8 },
  SNAP: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.5 },
};

interface DecisionBoundaryGaugeProps {
  confidence: number;
  threshold?: number;
  isReversalTriggered?: boolean;
}

export const DecisionBoundaryGauge: React.FC<DecisionBoundaryGaugeProps> = ({
  confidence,
  threshold = 75,
  isReversalTriggered = false,
}) => {
  const percent = Math.min(Math.max(confidence, 0), 100);
  const isCritical = confidence < threshold || isReversalTriggered;

  return (
    <div className="bg-[#14181a] rounded-lg p-4 border border-[#242a2e] font-mono text-left select-none">
      <div className="flex justify-between items-center mb-3 text-xs uppercase tracking-wider">
        <span className="text-[#8a9aaa] font-bold">Decision Boundary Gauge</span>
        <span className="text-[#5a6a7a]">Reversal Threshold: {threshold}%</span>
      </div>

      <div className="relative my-4">
        {/* Track */}
        <div className="h-2.5 bg-[#0a0d0f] rounded-full overflow-hidden border border-[#242a2e]">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: '0%' }}
            animate={{
              width: `${percent}%`,
              background: isCritical
                ? 'linear-gradient(90deg, #f39c12, #e74c3c)'
                : 'linear-gradient(90deg, #3498db, #2ecc71)',
            }}
            transition={SPRING.BUTTER}
          />
        </div>

        {/* Threshold vertical line marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#e8edf2] shadow-sm z-10"
          style={{ left: `${threshold}%` }}
        >
          <span className="absolute -top-4 -translate-x-1/2 text-[8px] text-[#8a9aaa] font-bold">
            75%
          </span>
        </div>

        {/* Current value badge */}
        <motion.div
          className="absolute -top-6 text-xs font-bold"
          animate={{
            left: `${percent}%`,
            color: isCritical ? '#e74c3c' : '#2ecc71',
          }}
          transition={SPRING.BUTTER}
          style={{ transform: 'translateX(-50%)' }}
        >
          {confidence}%
        </motion.div>
      </div>

      {/* Alert callout when boundary crossed */}
      {isCritical && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.SNAP}
          className="mt-3 p-2 bg-[#e74c3c]/15 border border-[#e74c3c] rounded text-[11px] text-[#e74c3c] flex items-center gap-2 font-bold"
        >
          <span className="text-sm">⚡</span>
          <span>DECISION REVERSAL TRIGGERED — Confidence fell below satisficing threshold ({threshold}%)</span>
        </motion.div>
      )}
    </div>
  );
};
