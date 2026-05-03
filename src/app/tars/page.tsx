'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/solana/solana-provider'
import { ChatInterface } from '@/components/tars/chat-interface'
import { BehavioralDashboard } from '@/components/tars/behavioral-dashboard'
import { ActivityFeed } from '@/components/tars/activity-feed'
import { DeviationAlert } from '@/components/tars/deviation-alert'
import { useTarsProgram } from '@/components/tars/tars-data-access'
import { toast } from 'sonner'

export default function TarsPage() {
  const { publicKey } = useWallet()
  const {
    fetchTwin,
    initializeTwin,
    logDecision,
    updatePattern,
    verifyDeviation,
    exportMemory,
  } = useTarsProgram()

  const [deviationScore, setDeviationScore] = useState<number | null>(null)
  const [lastPattern, setLastPattern] = useState<number[] | null>(null)

  if (!publicKey) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">TARS</h1>
          <p className="text-zinc-400 max-w-md">
            Sovereign Memory Protocol — your cognitive fingerprint, hashed with
            Poseidon, owned by your wallet.
          </p>
        </div>
        <WalletButton />
      </div>
    )
  }

  async function handlePatternReady(pattern: number[]) {
    setLastPattern(pattern)

    // Check deviation against stored twin (if exists)
    if (fetchTwin.data) {
      try {
        const score = await verifyDeviation.mutateAsync(pattern)
        setDeviationScore(score as number)
      } catch {
        // Twin not initialized yet — skip deviation check
      }

      // Update pattern on-chain
      await updatePattern.mutateAsync(pattern)

      // Log the session as a decision
      await logDecision.mutateAsync({
        decision: 'Behavioral session completed',
        context: `Pattern: [${pattern.join(', ')}]`,
        deviationScore: deviationScore ?? 0,
      })
    } else {
      // First time — initialize twin then update pattern
      try {
        await initializeTwin.mutateAsync()
        await updatePattern.mutateAsync(pattern)
      } catch (e) {
        toast.error(`Setup failed: ${e}`)
      }
    }
  }

  function handleDeviationScore(score: number) {
    setDeviationScore(score)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">TARS</h1>
          <p className="text-sm text-zinc-500">Sovereign Memory Protocol</p>
        </div>
        <div className="flex gap-3">
          {!fetchTwin.data && (
            <button
              onClick={() => initializeTwin.mutate()}
              disabled={initializeTwin.isPending}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {initializeTwin.isPending ? 'Initializing…' : 'Initialize Twin'}
            </button>
          )}
          {fetchTwin.data && (
            <button
              onClick={() => exportMemory.mutate()}
              disabled={exportMemory.isPending}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              {exportMemory.isPending ? 'Exporting…' : 'Export Memory'}
            </button>
          )}
          <WalletButton />
        </div>
      </div>

      {/* Deviation alert (top-level) */}
      {deviationScore !== null && (
        <DeviationAlert score={deviationScore} show />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" style={{ height: '65vh' }}>
        {/* Left: Chat */}
        <ChatInterface
          onPatternReady={handlePatternReady}
          onDeviationScore={handleDeviationScore}
        />

        {/* Right: Dashboard + Feed */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <BehavioralDashboard
            twin={fetchTwin.data ?? null}
            loading={fetchTwin.isLoading}
          />
          <ActivityFeed
            decisions={[]}
            loading={false}
          />
        </div>
      </div>
    </div>
  )
}
