use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;
use crate::error::TarsError;
use crate::state::{DecisionLog, TwinAccount};

#[derive(Accounts)]
#[instruction(decision: String, context: String, deviation_score: u8)]
pub struct LogDecision<'info> {
    #[account(
        mut,
        seeds = [b"twin", owner.key().as_ref()],
        bump,
        has_one = owner @ TarsError::Unauthorized
    )]
    pub twin: Account<'info, TwinAccount>,
    #[account(
        init,
        payer = owner,
        space = 8 + DecisionLog::INIT_SPACE,
        seeds = [
            b"decision",
            twin.key().as_ref(),
            &twin.decision_count.to_le_bytes()
        ],
        bump
    )]
    pub decision_log: Account<'info, DecisionLog>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<LogDecision>,
    decision: String,
    context: String,
    deviation_score: u8,
) -> Result<()> {
    require!(decision.len() <= 256, TarsError::DecisionTooLong);
    require!(context.len() <= 256, TarsError::ContextTooLong);

    let clock = Clock::get()?;

    let decision_hash: [u8; 32] = hashv(&[decision.as_bytes()]).to_bytes();
    let context_hash: [u8; 32] = hashv(&[context.as_bytes()]).to_bytes();

    let log = &mut ctx.accounts.decision_log;
    log.twin = ctx.accounts.twin.key();
    log.decision_hash = decision_hash;
    log.context_hash = context_hash;
    log.timestamp = clock.unix_timestamp;
    log.deviation_score = deviation_score;

    let twin = &mut ctx.accounts.twin;
    twin.decision_count = twin.decision_count.checked_add(1).unwrap();
    twin.updated_at = clock.unix_timestamp;

    Ok(())
}
