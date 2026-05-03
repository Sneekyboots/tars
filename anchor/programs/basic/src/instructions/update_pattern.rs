use anchor_lang::prelude::*;
use anchor_lang::solana_program::poseidon::{hashv as poseidon_hashv, Endianness, Parameters};
use crate::error::TarsError;
use crate::state::{TwinAccount, MAX_PATTERN_ENTRIES};

#[derive(Accounts)]
#[instruction(pattern_vector: Vec<u64>)]
pub struct UpdatePattern<'info> {
    #[account(
        mut,
        seeds = [b"twin", owner.key().as_ref()],
        bump,
        has_one = owner @ TarsError::Unauthorized
    )]
    pub twin: Account<'info, TwinAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdatePattern>, pattern_vector: Vec<u64>) -> Result<()> {
    require!(!pattern_vector.is_empty(), TarsError::EmptyPattern);
    require!(
        pattern_vector.len() <= MAX_PATTERN_ENTRIES,
        TarsError::PatternTooLarge
    );

    // Serialize each u64 as little-endian bytes for Poseidon input
    let encoded: Vec<[u8; 8]> = pattern_vector.iter().map(|v| v.to_le_bytes()).collect();
    let inputs: Vec<&[u8]> = encoded.iter().map(|b| b.as_slice()).collect();

    let hash_result =
        poseidon_hashv(Parameters::Bn254X5, Endianness::BigEndian, inputs.as_slice())
            .map_err(|_| TarsError::HashingFailed)?;

    let clock = Clock::get()?;
    let twin = &mut ctx.accounts.twin;
    twin.behavioral_hash = hash_result.to_bytes();
    twin.pattern_vector = pattern_vector;
    twin.updated_at = clock.unix_timestamp;

    Ok(())
}
