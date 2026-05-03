'use client'

import { useState, useRef, useEffect } from 'react'
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
      // Extract behavioral signals
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

      // Synthesise a brief assistant acknowledgement
      const assistantMsg: Message = {
        role: 'assistant',
        content: buildAck(newSignals, userMessageCount + 1),
      }
      setMessages((prev) => [...prev, assistantMsg])

      // After TARGET_COUNT interactions fire pattern ready
      if (userMessageCount + 1 >= TARGET_COUNT && !patternReady) {
        setPatternReady(true)
        onPatternReady(patternVector)
      }

      // Deviation check: compare accumulated signals vs first snapshot
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
    <div className="flex flex-col h-full rounded-xl border border-white/10 bg-black/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="font-semibold text-white">Cognitive Capture</h2>
        <span className="text-xs text-zinc-500">
          {userMessageCount}/{TARGET_COUNT * 2} interactions
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-600 italic">
            Share thoughts, decisions, or ideas — TARS is building your twin model.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/10 text-zinc-200'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-2 text-sm text-zinc-400 animate-pulse">
              Analysing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Deviation alert */}
      {deviationScore !== null && (
        <div className="px-5 pb-2">
          <DeviationAlert score={deviationScore} show />
        </div>
      )}

      {/* Pattern ready banner */}
      {patternReady && (
        <div className="mx-5 mb-2 rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2 text-sm text-violet-300">
          ✦ Pattern ready — fingerprint committed to chain
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-white/10 px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a thought, decision, or idea…"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
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
