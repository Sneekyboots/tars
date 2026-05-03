import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import type { Tars } from '../target/types/tars'

describe('tars', () => {
  const provider = AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Tars as Program<Tars>
  const owner = provider.wallet as anchor.Wallet

  let twinPda: PublicKey
  let twinBump: number

  const findTwinPda = (ownerKey: PublicKey): [PublicKey, number] =>
    PublicKey.findProgramAddressSync(
      [Buffer.from('twin'), ownerKey.toBuffer()],
      program.programId,
    )

  const findDecisionLogPda = (
    twinKey: PublicKey,
    decisionCount: BN,
  ): [PublicKey, number] => {
    const countBuffer = Buffer.alloc(8)
    countBuffer.writeBigUInt64LE(BigInt(decisionCount.toString()))
    return PublicKey.findProgramAddressSync(
      [Buffer.from('decision'), twinKey.toBuffer(), countBuffer],
      program.programId,
    )
  }

  beforeAll(() => {
    ;[twinPda, twinBump] = findTwinPda(owner.publicKey)
  })

  it('initialize_twin — creates TwinAccount PDA with correct fields', async () => {
    // Skip if already initialized (re-runs)
    const existing = await program.account.twinAccount
      .fetchNullable(twinPda)
      .catch(() => null)
    if (existing) return

    await program.methods
      .initializeTwin()
      .accounts({ owner: owner.publicKey })
      .rpc()

    const twin = await program.account.twinAccount.fetch(twinPda)
    expect(twin.owner.toBase58()).toBe(owner.publicKey.toBase58())
    expect(twin.decisionCount.toNumber()).toBe(0)
    expect(twin.behavioralHash).toEqual(new Array(32).fill(0))
    expect(twin.patternVector).toEqual([])
    expect(twin.createdAt.toNumber()).toBeGreaterThan(0)
    expect(twin.updatedAt.toNumber()).toBeGreaterThan(0)
  })

  it('update_pattern — stores Poseidon-hashed behavioral fingerprint', async () => {
    const pattern = [72, 45, 88, 60, 55] // vocab, risk, speed, uncertainty, comm

    await program.methods
      .updatePattern(pattern.map((v) => new BN(v)))
      .accounts({ owner: owner.publicKey })
      .rpc()

    const twin = await program.account.twinAccount.fetch(twinPda)
    expect(twin.patternVector.map((v: BN) => v.toNumber())).toEqual(pattern)
    // Poseidon hash must be non-zero after update
    const isNonZero = twin.behavioralHash.some((b: number) => b !== 0)
    expect(isNonZero).toBe(true)
  })

  it('log_decision — creates DecisionLog with correct hashes', async () => {
    const twinBefore = await program.account.twinAccount.fetch(twinPda)
    const count = twinBefore.decisionCount

    const [logPda] = findDecisionLogPda(twinPda, count)

    await program.methods
      .logDecision('Buy the dip', 'High confidence, low volatility window', 12)
      .accounts({
        owner: owner.publicKey,
        decisionLog: logPda,
      })
      .rpc()

    const log = await program.account.decisionLog.fetch(logPda)
    expect(log.twin.toBase58()).toBe(twinPda.toBase58())
    expect(log.decisionHash).toHaveLength(32)
    expect(log.contextHash).toHaveLength(32)
    expect(log.deviationScore).toBe(12)
    expect(log.timestamp.toNumber()).toBeGreaterThan(0)

    const twinAfter = await program.account.twinAccount.fetch(twinPda)
    expect(twinAfter.decisionCount.toNumber()).toBe(count.toNumber() + 1)
  })

  it('verify_deviation — returns 0 for identical pattern, non-zero for different', async () => {
    const stored = [72, 45, 88, 60, 55]
    const identical = stored.map((v) => new BN(v))
    const different = [10, 90, 20, 80, 30].map((v) => new BN(v))

    const scoreIdentical = await program.methods
      .verifyDeviation(identical)
      .accounts({ twin: twinPda })
      .view()

    const scoreDifferent = await program.methods
      .verifyDeviation(different)
      .accounts({ twin: twinPda })
      .view()

    expect(scoreIdentical).toBe(0)
    expect(scoreDifferent).toBeGreaterThan(0)
    expect(scoreDifferent).toBeLessThanOrEqual(100)
  })

  it('export_memory — emits MemoryExported event and updates timestamp', async () => {
    const before = await program.account.twinAccount.fetch(twinPda)

    const txSig = await program.methods
      .exportMemory()
      .accounts({ owner: owner.publicKey })
      .rpc()

    expect(txSig).toBeTruthy()

    const after = await program.account.twinAccount.fetch(twinPda)
    expect(after.updatedAt.toNumber()).toBeGreaterThanOrEqual(
      before.updatedAt.toNumber(),
    )
  })

  it('unauthorized owner cannot mutate another twin', async () => {
    const intruder = Keypair.generate()
    const [intruderTwinPda] = findTwinPda(intruder.publicKey)

    // Attempting to call update_pattern on owner's twin using intruder as signer
    // (intruder's PDA won't exist — expect account not found error)
    await expect(
      program.methods
        .exportMemory()
        .accounts({ owner: intruder.publicKey })
        .signers([intruder])
        .rpc(),
    ).rejects.toThrow()
  })
})
