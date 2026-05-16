'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DeviationAlert } from './deviation-alert'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BehavioralSignals {
  vocabulary_complexity: number
  risk_tolerance: number
  decision_speed: number
  uncertainty_handling: number
  communication_style: number
}

interface ChatInterfaceProps {
  onPatternReady: (pattern: number[]) => void
  onDeviationScore: (score: number) => void
}

const TARGET_COUNT = 5

export function ChatInterface({ onPatternReady, onDeviationScore }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signals, setSignals] = useState<BehavioralSignals | null>(null)
  const [deviationScore, setDeviationScore] = useState<number | null>(null)
  const [patternReady, setPatternReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const userMessageCount = messages.filter((m) => m.role === 'user').length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/behavioral/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          prev_signals: signals,
        }),
      })

      if (!res.ok) throw new Error('Extraction failed')

      const data = await res.json()
      const newSignals: BehavioralSignals = data.signals
      const patternVector: number[] = data.pattern_vector

      setSignals(newSignals)

      const assistantMsg: Message = {
        role: 'assistant',
        content: buildAck(newSignals, userMessageCount + 1),
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (userMessageCount + 1 >= TARGET_COUNT && !patternReady) {
        setPatternReady(true)
        onPatternReady(patternVector)
      }

      if (signals) {
        const deviation = computeDeviation(signals, newSignals)
        setDeviationScore(deviation)
        onDeviationScore(deviation)
      }
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Signal extraction failed. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className="flex flex-col h-full rounded-xl border-2 border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Glow effect background */}
      <motion.div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl opacity-5 pointer-events-none" />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-4 relative z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="font-bold text-lg text-transparent bg-gradient-to-r from-cyan-300 to-magenta-300 bg-clip-text">
          Cognitive Capture
        </h2>
        <motion.span
          className="text-xs text-cyan-400/60 font-mono"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {userMessageCount}/{TARGET_COUNT * 2} interactions
        </motion.span>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0 relative z-10">
        {messages.length === 0 && (
          <motion.p
            className="text-sm text-cyan-400/40 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Share thoughts, decisions, or ideas — TARS is building your twin model.
          </motion.p>
        )}
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium backdrop-blur-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-magenta-600 to-magenta-500 text-white shadow-lg shadow-magenta-500/30'
                    : 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/40'
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="bg-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-cyan-300 border border-cyan-500/40">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ✦ Analysing…
              </motion.span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Deviation alert */}
      {deviationScore !== null && (
        <motion.div
          className="px-5 pb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <DeviationAlert score={deviationScore} show />
        </motion.div>
      )}

      {/* Pattern ready banner */}
      {patternReady && (
        <motion.div
          className="mx-5 mb-2 rounded-lg border-2 border-magenta-500/60 bg-magenta-950/40 px-4 py-3 text-sm font-semibold text-magenta-300 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          ✦ Pattern ready — fingerprint committed to chain
        </motion.div>
      )}

      {/* Input */}
      <motion.form
        onSubmit={handleSubmit}
        className="flex gap-3 border-t border-cyan-500/20 px-4 py-4 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a thought, decision, or idea…"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 text-sm text-cyan-50 placeholder-cyan-600/50 outline-none focus:ring-2 focus:ring-magenta-500/50 focus:border-magenta-500/50 disabled:opacity-50 transition-all backdrop-blur-sm"
        />
        <motion.button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="relative rounded-lg bg-gradient-to-r from-magenta-600 to-magenta-500 px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-magenta-500/50 disabled:opacity-40 transition-all overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-magenta-400 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
          <span className="relative">Send</span>
        </motion.button>
      </motion.form>
    </motion.div>
  )
}

function buildAck(signals: BehavioralSignals, count: number): string {
  const dominant = Object.entries(signals).sort(([, a], [, b]) => b - a)[0][0]
  const labels: Record<string, string> = {
    vocabulary_complexity: 'complex vocabulary',
    risk_tolerance: 'risk appetite',
    decision_speed: 'decisive style',
    uncertainty_handling: 'comfort with uncertainty',
    communication_style: 'elaborate communication',
  }
  return `Signal captured (${count}). Dominant trait: ${labels[dominant] ?? dominant}.`
}

function computeDeviation(prev: BehavioralSignals, curr: BehavioralSignals): number {
  const keys = Object.keys(prev) as (keyof BehavioralSignals)[]
  const total = keys.reduce((sum, k) => sum + Math.abs(prev[k] - curr[k]), 0)
  return Math.min(100, Math.round((total / (keys.length * 100)) * 100))
}
