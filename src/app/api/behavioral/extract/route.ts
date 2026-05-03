import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

interface Message {
  role: string
  content: string
}

interface BehavioralSignals {
  vocabulary_complexity: number
  risk_tolerance: number
  decision_speed: number
  uncertainty_handling: number
  communication_style: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, prev_signals } = body as {
      messages: Message[]
      prev_signals?: BehavioralSignals
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system:
        'You are a behavioral analyst. Analyse the user messages and extract structured behavioral signals. ' +
        'Call the extract_behavioral_signals tool with scores from 0-100 for each dimension based on the conversation.',
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: [
        {
          name: 'extract_behavioral_signals',
          description:
            'Extract quantified behavioral signals from a conversation. All scores are 0–100.',
          input_schema: {
            type: 'object',
            properties: {
              vocabulary_complexity: {
                type: 'number',
                description:
                  '0 = simple monosyllabic words, 100 = highly technical/academic vocabulary',
              },
              risk_tolerance: {
                type: 'number',
                description:
                  '0 = extreme risk aversion, 100 = embrace high-risk high-reward choices',
              },
              decision_speed: {
                type: 'number',
                description:
                  '0 = prolonged deliberation, 100 = immediate decisive action',
              },
              uncertainty_handling: {
                type: 'number',
                description:
                  '0 = paralysed by ambiguity, 100 = comfortable acting on incomplete info',
              },
              communication_style: {
                type: 'number',
                description:
                  '0 = terse/minimal, 100 = verbose/elaborate with many qualifications',
              },
            },
            required: [
              'vocabulary_complexity',
              'risk_tolerance',
              'decision_speed',
              'uncertainty_handling',
              'communication_style',
            ],
          },
        },
      ],
      tool_choice: { type: 'any' },
    })

    const toolUse = response.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Model did not return behavioral signals' },
        { status: 500 },
      )
    }

    const newSignals = toolUse.input as BehavioralSignals

    // Exponential moving average with prior signals if provided
    const signals: BehavioralSignals = prev_signals
      ? {
          vocabulary_complexity: Math.round(
            0.6 * prev_signals.vocabulary_complexity + 0.4 * newSignals.vocabulary_complexity,
          ),
          risk_tolerance: Math.round(
            0.6 * prev_signals.risk_tolerance + 0.4 * newSignals.risk_tolerance,
          ),
          decision_speed: Math.round(
            0.6 * prev_signals.decision_speed + 0.4 * newSignals.decision_speed,
          ),
          uncertainty_handling: Math.round(
            0.6 * prev_signals.uncertainty_handling + 0.4 * newSignals.uncertainty_handling,
          ),
          communication_style: Math.round(
            0.6 * prev_signals.communication_style + 0.4 * newSignals.communication_style,
          ),
        }
      : newSignals

    const pattern_vector: number[] = [
      signals.vocabulary_complexity,
      signals.risk_tolerance,
      signals.decision_speed,
      signals.uncertainty_handling,
      signals.communication_style,
    ]

    return NextResponse.json({ signals, pattern_vector })
  } catch (err) {
    console.error('Behavioral extraction error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
