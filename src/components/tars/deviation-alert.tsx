'use client'

import { motion } from 'framer-motion'

interface DeviationAlertProps {
  score: number
  show: boolean
}

export function DeviationAlert({ score, show }: DeviationAlertProps) {
  if (!show) return null

  const isDeviated = score > 30

  return (
    <motion.div
      className={`rounded-lg border-2 px-4 py-4 text-sm font-semibold backdrop-blur-sm relative overflow-hidden ${
        isDeviated
          ? 'border-red-500/60 bg-red-950/30 text-red-300'
          : 'border-green-500/60 bg-green-950/30 text-green-300'
      }`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Animated background glow */}
      <motion.div
        className={`absolute inset-0 ${
          isDeviated ? 'bg-red-500/10' : 'bg-green-500/10'
        } blur-xl`}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex items-center gap-2"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {isDeviated ? (
          <>
            <motion.span
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1 }}
              className="text-lg"
            >
              ⚠
            </motion.span>
            <span>
              Deviation detected:{' '}
              <motion.span
                className="font-bold text-red-100"
                animate={{ textShadow: [
                  '0 0 5px rgba(239, 68, 68, 0)',
                  '0 0 15px rgba(239, 68, 68, 0.8)',
                  '0 0 5px rgba(239, 68, 68, 0)',
                ]}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {score}/100
              </motion.span>
              {' — '} current behaviour diverges from your twin model
            </span>
          </>
        ) : (
          <>
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
              className="text-lg"
            >
              ✓
            </motion.span>
            <span>
              Pattern consistent:{' '}
              <motion.span
                className="font-bold text-green-100"
                animate={{ textShadow: [
                  '0 0 5px rgba(34, 197, 94, 0)',
                  '0 0 15px rgba(34, 197, 94, 0.8)',
                  '0 0 5px rgba(34, 197, 94, 0)',
                ]}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {score}/100
              </motion.span>
              {' — '} within normal range
            </span>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
