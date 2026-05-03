'use client'

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
  { label: 'Vocabulary Complexity', key: 0 },
  { label: 'Risk Tolerance',        key: 1 },
  { label: 'Decision Speed',        key: 2 },
  { label: 'Uncertainty Handling',  key: 3 },
  { label: 'Communication Style',   key: 4 },
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
      <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-zinc-400">
        Loading twin model…
      </div>
    )
  }

  if (!twin) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-zinc-500">
        No twin initialized. Start chatting to build your cognitive fingerprint.
      </div>
    )
  }

  const vector = twin.patternVector.map((v: BN) => v.toNumber())
  const isHashed = twin.behavioralHash.some((b: number) => b !== 0)

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Twin Model</h2>
        <span className="text-xs text-zinc-500">
          {twin.decisionCount.toNumber()} decisions logged
        </span>
      </div>

      {/* Behavioral dimensions */}
      <div className="space-y-3">
        {DIMENSIONS.map(({ label, key }) => {
          const val = vector[key] ?? 0
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{label}</span>
                <span>{val}/100</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Hash */}
      <div className="rounded-lg bg-white/5 px-4 py-3">
        <p className="text-xs text-zinc-500 mb-1">Behavioral Hash</p>
        <p className="font-mono text-sm text-violet-300">
          {isHashed ? `0x${hexFrom(twin.behavioralHash)}…` : '(unset — run update pattern)'}
        </p>
      </div>

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-zinc-500">
        <span>
          Created:{' '}
          {new Date(twin.createdAt.toNumber() * 1000).toLocaleDateString()}
        </span>
        <span>
          Updated:{' '}
          {new Date(twin.updatedAt.toNumber() * 1000).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
