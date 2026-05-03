import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import TarsIDL from '../target/idl/tars.json'
import type { Tars } from '../target/types/tars'

export { Tars, TarsIDL }

export const TARS_PROGRAM_ID = new PublicKey(TarsIDL.address)

export function getTarsProgram(
  provider: AnchorProvider,
  address?: PublicKey,
): Program<Tars> {
  return new Program(
    {
      ...TarsIDL,
      address: address ? address.toBase58() : TarsIDL.address,
    } as Tars,
    provider,
  )
}

export function getTarsProgramId(cluster: Cluster): PublicKey {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      return new PublicKey('JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H')
    case 'mainnet-beta':
    default:
      return TARS_PROGRAM_ID
  }
}
