'use client'

interface DeviationAlertProps {
  score: number
  show: boolean
}

export function DeviationAlert({ score, show }: DeviationAlertProps) {
  if (!show) return null

  const isDeviated = score > 30

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${
        isDeviated
          ? 'border-red-400 bg-red-950/40 text-red-300'
          : 'border-green-500 bg-green-950/40 text-green-300'
      }`}
    >
      {isDeviated ? (
        <span>
          ⚠ Deviation detected:{' '}
          <span className="font-bold">{score}/100</span> — current behaviour
          diverges from your twin model
        </span>
      ) : (
        <span>
          ✓ Pattern consistent:{' '}
          <span className="font-bold">{score}/100</span> — within normal range
        </span>
      )}
    </div>
  )
}
