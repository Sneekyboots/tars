use anchor_lang::prelude::*;
use crate::state::TwinAccount;

#[derive(Accounts)]
pub struct InitializeTwin<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + TwinAccount::INIT_SPACE,
        seeds = [b"twin", owner.key().as_ref()],
        bump
    )]
    pub twin: Account<'info, TwinAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeTwin>) -> Result<()> {
    let clock = Clock::get()?;
    let twin = &mut ctx.accounts.twin;

    twin.owner = ctx.accounts.owner.key();
    twin.behavioral_hash = [0u8; 32];
    twin.pattern_vector = Vec::new();
    twin.decision_count = 0;
    twin.created_at = clock.unix_timestamp;
    twin.updated_at = clock.unix_timestamp;

    Ok(())
}
