'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BN } from '@coral-xyz/anchor'

interface DecisionLogData {
  twin: { toBase58: () => string }
  decisionHash: number[]
  contextHash: number[]
  timestamp: BN
  deviationScore: number
}

interface ActivityFeedProps {
  decisions: DecisionLogData[]
  loading: boolean
}

function hexTrunc(bytes: number[]): string {
  return (
    '0x' +
    bytes
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12) +
    '…'
  )
}

function deviationColor(score: number): string {
  if (score <= 20) return 'bg-green-500/30 text-green-200 border border-green-500/50'
  if (score <= 50) return 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
  return 'bg-red-500/30 text-red-200 border border-red-500/50'
}

export function ActivityFeed({ decisions, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <motion.div
        className="rounded-xl border-2 border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-cyan-400/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ✦ Loading activity…
        </motion.span>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="rounded-xl border-2 border-magenta-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-4 relative overflow-hidden backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Glow effect */}
      <motion.div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500 rounded-full filter blur-3xl opacity-5 pointer-events-none" />

      {/* Header */}
      <motion.h2
        className="text-xl font-bold text-transparent bg-gradient-to-r from-magenta-300 to-cyan-300 bg-clip-text relative z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        On-chain Activity
      </motion.h2>

      {decisions.length === 0 ? (
        <motion.p
          className="text-sm text-magenta-400/50 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          No decisions logged yet.
        </motion.p>
      ) : (
        <motion.ul
          className="space-y-3 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AnimatePresence>
            {decisions.map((d, i) => (
              <motion.li
                key={i}
                className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-4 py-4 text-sm border border-cyan-500/20 hover:border-magenta-500/40 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ x: 5 }}
              >
                <div className="space-y-1">
                  <motion.p
                    className="font-mono text-xs text-cyan-400/70"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {hexTrunc(d.decisionHash)}
                  </motion.p>
                  <p className="text-xs text-magenta-400/60">
                    {new Date(d.timestamp.toNumber() * 1000).toLocaleString()}
                  </p>
                </div>
                <motion.span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${deviationColor(
                    d.deviationScore,
                  )}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 + 0.1 }}
                  whileHover={{ scale: 1.1 }}
                >
                  Δ {d.deviationScore}
                </motion.span>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </motion.div>
  )
}
