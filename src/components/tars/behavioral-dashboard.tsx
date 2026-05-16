'use client'

import { motion } from 'framer-motion'
import { BN } from '@coral-xyz/anchor'

interface TwinAccountData {
  owner: { toBase58: () => string }
  behavioralHash: number[]
  patternVector: BN[]
  decisionCount: BN
  createdAt: BN
  updatedAt: BN
}

interface BehavioralDashboardProps {
  twin: TwinAccountData | null
  loading: boolean
}

const DIMENSIONS = [
  { label: 'Vocabulary Complexity', key: 0, color: 'from-cyan-500 to-cyan-400' },
  { label: 'Risk Tolerance',        key: 1, color: 'from-magenta-500 to-magenta-400' },
  { label: 'Decision Speed',        key: 2, color: 'from-violet-500 to-violet-400' },
  { label: 'Uncertainty Handling',  key: 3, color: 'from-cyan-400 to-magenta-400' },
  { label: 'Communication Style',   key: 4, color: 'from-magenta-400 to-violet-400' },
]

function hexFrom(bytes: number[]): string {
  return bytes
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export function BehavioralDashboard({ twin, loading }: BehavioralDashboardProps) {
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
          ✦ Loading twin model…
        </motion.span>
      </motion.div>
    )
  }

  if (!twin) {
    return (
      <motion.div
        className="rounded-xl border-2 border-magenta-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-magenta-400/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        No twin initialized. Start chatting to build your cognitive fingerprint.
      </motion.div>
    )
  }

  const vector = twin.patternVector.map((v: BN) => v.toNumber())
  const isHashed = twin.behavioralHash.some((b: number) => b !== 0)

  return (
    <motion.div
      className="rounded-xl border-2 border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6 relative overflow-hidden backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Glow effect */}
      <motion.div className="absolute -top-20 -right-20 w-40 h-40 bg-magenta-500 rounded-full filter blur-3xl opacity-5 pointer-events-none" />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between relative z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-300 to-magenta-300 bg-clip-text">
          Twin Model
        </h2>
        <motion.span
          className="text-xs text-cyan-400/60 font-mono"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {twin.decisionCount.toNumber()} decisions logged
        </motion.span>
      </motion.div>

      {/* Behavioral dimensions */}
      <motion.div
        className="space-y-4 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {DIMENSIONS.map(({ label, key, color }) => {
          const val = vector[key] ?? 0
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + key * 0.05 }}
            >
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-cyan-300/80 font-medium">{label}</span>
                <motion.span
                  className="text-magenta-400/80 font-mono font-bold"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {val}/100
                </motion.span>
              </div>
              <div className="h-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${color} shadow-lg`}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Hash display */}
      <motion.div
        className="rounded-lg border-2 border-magenta-500/30 bg-magenta-500/5 px-4 py-4 relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <p className="text-xs text-magenta-400/60 mb-2 font-medium">Behavioral Hash</p>
        <motion.p
          className="font-mono text-sm text-magenta-300 break-all"
          animate={{ textShadow: [
            '0 0 5px rgba(219, 39, 119, 0)',
            '0 0 15px rgba(219, 39, 119, 0.5)',
            '0 0 5px rgba(219, 39, 119, 0)',
          ]}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isHashed ? `0x${hexFrom(twin.behavioralHash)}…` : '(unset — run update pattern)'}
        </motion.p>
      </motion.div>

      {/* Timestamps */}
      <motion.div
        className="flex gap-4 text-xs text-cyan-400/60 relative z-10 pt-2 border-t border-cyan-500/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span className="font-mono">
          Created: {new Date(twin.createdAt.toNumber() * 1000).toLocaleDateString()}
        </span>
        <span className="font-mono">
          Updated: {new Date(twin.updatedAt.toNumber() * 1000).toLocaleDateString()}
        </span>
      </motion.div>
    </motion.div>
  )
}
