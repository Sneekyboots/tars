use anchor_lang::prelude::*;
use crate::state::TwinAccount;

#[derive(Accounts)]
pub struct VerifyDeviation<'info> {
    #[account(
        seeds = [b"twin", twin.owner.as_ref()],
        bump
    )]
    pub twin: Account<'info, TwinAccount>,
}

pub fn handler(ctx: Context<VerifyDeviation>, current_pattern: Vec<u64>) -> Result<u8> {
    let stored = &ctx.accounts.twin.pattern_vector;

    // Max deviation when lengths mismatch (uninitialized twin or incompatible snapshot)
    if stored.is_empty() || current_pattern.len() != stored.len() {
        return Ok(100u8);
    }

    let n = stored.len() as u64;

    // Manhattan distance normalised to 0-100
    // Each dimension is 0-100, so max distance per entry is 100
    let total_distance: u64 = current_pattern
        .iter()
        .zip(stored.iter())
        .map(|(a, b)| a.abs_diff(*b))
        .sum();

    let max_possible = n.saturating_mul(100);
    let score = if max_possible == 0 {
        0u8
    } else {
        ((total_distance.saturating_mul(100)) / max_possible).min(100) as u8
    };

    Ok(score)
}
