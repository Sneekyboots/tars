'use client'

import { getTarsProgram, getTarsProgramId } from '@project/anchor'
import { useAnchorProvider } from '@/components/solana/solana-provider'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useCluster } from '@/components/cluster/cluster-data-access'

export function useTarsProgram() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const provider = useAnchorProvider()

  const programId = useMemo(
    () => getTarsProgramId(cluster.network as Cluster),
    [cluster],
  )
  const program = useMemo(() => getTarsProgram(provider, programId), [provider, programId])

  const twinPda = useMemo(() => {
    if (!publicKey) return null
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('twin'), publicKey.toBuffer()],
      programId,
    )
    return pda
  }, [publicKey, programId])

  const findDecisionLogPda = (twinKey: PublicKey, decisionCount: number) => {
    const countBuffer = Buffer.alloc(8)
    countBuffer.writeBigUInt64LE(BigInt(decisionCount))
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('decision'), twinKey.toBuffer(), countBuffer],
      programId,
    )
    return pda
  }

  const fetchTwin = useQuery({
    queryKey: ['tars-twin', { cluster, publicKey: publicKey?.toBase58() }],
    queryFn: async () => {
      if (!twinPda) return null
      return program.account.twinAccount.fetchNullable(twinPda)
    },
    enabled: !!twinPda,
  })

  const initializeTwin = useMutation({
    mutationKey: ['tars', 'initialize-twin', { cluster }],
    mutationFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      return program.methods
        .initializeTwin()
        .accounts({ owner: publicKey })
        .rpc()
    },
    onSuccess: (sig) => {
      toast.success('Twin initialized on-chain')
      fetchTwin.refetch()
      return sig
    },
    onError: (e) => toast.error(`Init failed: ${e}`),
  })

  const logDecision = useMutation({
    mutationKey: ['tars', 'log-decision', { cluster }],
    mutationFn: async ({
      decision,
      context,
      deviationScore,
    }: {
      decision: string
      context: string
      deviationScore: number
    }) => {
      if (!publicKey || !twinPda) throw new Error('Wallet not connected')
      const twin = await program.account.twinAccount.fetch(twinPda)
      const logPda = findDecisionLogPda(twinPda, twin.decisionCount.toNumber())
      return program.methods
        .logDecision(decision, context, deviationScore)
        .accounts({ owner: publicKey, decisionLog: logPda })
        .rpc()
    },
    onSuccess: () => {
      toast.success('Decision logged on-chain')
      fetchTwin.refetch()
    },
    onError: (e) => toast.error(`Log failed: ${e}`),
  })

  const updatePattern = useMutation({
    mutationKey: ['tars', 'update-pattern', { cluster }],
    mutationFn: async (patternVector: number[]) => {
      if (!publicKey) throw new Error('Wallet not connected')
      return program.methods
        .updatePattern(patternVector.map((v) => new BN(v)))
        .accounts({ owner: publicKey })
        .rpc()
    },
    onSuccess: () => {
      toast.success('Behavioral fingerprint updated')
      fetchTwin.refetch()
    },
    onError: (e) => toast.error(`Pattern update failed: ${e}`),
  })

  const verifyDeviation = useMutation({
    mutationKey: ['tars', 'verify-deviation', { cluster }],
    mutationFn: async (currentPattern: number[]) => {
      if (!twinPda) throw new Error('Twin not found')
      return program.methods
        .verifyDeviation(currentPattern.map((v) => new BN(v)))
        .accounts({ twin: twinPda })
        .view() as Promise<number>
    },
    onError: (e) => toast.error(`Deviation check failed: ${e}`),
  })

  const exportMemory = useMutation({
    mutationKey: ['tars', 'export-memory', { cluster }],
    mutationFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected')
      return program.methods
        .exportMemory()
        .accounts({ owner: publicKey })
        .rpc()
    },
    onSuccess: () => toast.success('Memory exported — event emitted on-chain'),
    onError: (e) => toast.error(`Export failed: ${e}`),
  })

  return {
    program,
    programId,
    twinPda,
    fetchTwin,
    initializeTwin,
    logDecision,
    updatePattern,
    verifyDeviation,
    exportMemory,
  }
}
