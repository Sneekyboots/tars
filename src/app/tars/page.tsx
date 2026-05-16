'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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
      <motion.div
        className="flex min-h-[100vh] flex-col items-center justify-center gap-8 text-center relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-magenta-500/20" />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Glowing orbs */}
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl opacity-10"
          animate={{ x: [0, 30, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-magenta-500 rounded-full filter blur-3xl opacity-10"
          animate={{ x: [0, -40, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10"
        >
          <motion.h1
            className="text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-magenta-400 to-violet-400 text-transparent bg-clip-text"
            animate={{ textShadow: [
              '0 0 10px rgba(34, 211, 238, 0.5)',
              '0 0 20px rgba(219, 39, 119, 0.5)',
              '0 0 10px rgba(34, 211, 238, 0.5)',
            ]}}
            transition={{ duration: 3, repeat: Infinity }}
          >
            TARS
          </motion.h1>
          <motion.p
            className="text-lg text-cyan-300/80 max-w-md mx-auto mb-8 font-light tracking-wide"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Sovereign Memory Protocol — your cognitive fingerprint, cryptographically owned.
          </motion.p>
        </motion.div>

        {/* Animated button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-lg blur opacity-50"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative">
              <WalletButton />
            </div>
          </div>
        </motion.div>

        {/* Scan lines effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-transparent opacity-10" />
        </motion.div>
      </motion.div>
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
    <motion.div
      className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Animated header */}
      <motion.div
        className="flex items-center justify-between mb-8 pb-6 border-b border-cyan-500/30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-magenta-400 text-transparent bg-clip-text">
            TARS
          </h1>
          <motion.p
            className="text-sm text-cyan-300/60 mt-1"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Sovereign Memory Protocol
          </motion.p>
        </div>
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {!fetchTwin.data && (
            <motion.button
              onClick={() => initializeTwin.mutate()}
              disabled={initializeTwin.isPending}
              className="relative rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-2 text-sm font-semibold text-black hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 transition-all overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              <span className="relative">
                {initializeTwin.isPending ? 'Initializing…' : 'Initialize Twin'}
              </span>
            </motion.button>
          )}
          {fetchTwin.data && (
            <motion.button
              onClick={() => exportMemory.mutate()}
              disabled={exportMemory.isPending}
              className="relative rounded-lg border-2 border-magenta-500/50 px-6 py-2 text-sm font-semibold text-magenta-300 hover:border-magenta-400 hover:shadow-lg hover:shadow-magenta-500/30 disabled:opacity-50 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {exportMemory.isPending ? 'Exporting…' : 'Export Memory'}
            </motion.button>
          )}
          <WalletButton />
        </motion.div>
      </motion.div>

      {/* Deviation alert */}
      {deviationScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DeviationAlert score={deviationScore} show />
        </motion.div>
      )}

      {/* Main grid with staggered animations */}
      <motion.div
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        style={{ height: '65vh' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* Left: Chat - slides in from left */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ChatInterface
            onPatternReady={handlePatternReady}
            onDeviationScore={handleDeviationScore}
          />
        </motion.div>

        {/* Right: Dashboard + Feed - slides in from right */}
        <motion.div
          className="flex flex-col gap-4 overflow-y-auto"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <BehavioralDashboard
              twin={fetchTwin.data ?? null}
              loading={fetchTwin.isLoading}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <ActivityFeed
              decisions={[]}
              loading={false}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
