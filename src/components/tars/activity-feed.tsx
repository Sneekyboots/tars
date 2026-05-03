'use client'

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
  if (score <= 20) return 'bg-green-500/20 text-green-300'
  if (score <= 50) return 'bg-yellow-500/20 text-yellow-300'
  return 'bg-red-500/20 text-red-300'
}

export function ActivityFeed({ decisions, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-zinc-400">
        Loading activity…
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">On-chain Activity</h2>

      {decisions.length === 0 ? (
        <p className="text-sm text-zinc-500">No decisions logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-sm"
            >
              <div className="space-y-0.5">
                <p className="font-mono text-xs text-zinc-400">
                  {hexTrunc(d.decisionHash)}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(d.timestamp.toNumber() * 1000).toLocaleString()}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${deviationColor(
                  d.deviationScore,
                )}`}
              >
                Δ {d.deviationScore}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
