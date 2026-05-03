use anchor_lang::prelude::*;
use crate::error::TarsError;
use crate::state::{MemoryExported, TwinAccount};

#[derive(Accounts)]
pub struct ExportMemory<'info> {
    #[account(
        mut,
        seeds = [b"twin", owner.key().as_ref()],
        bump,
        has_one = owner @ TarsError::Unauthorized
    )]
    pub twin: Account<'info, TwinAccount>,
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<ExportMemory>) -> Result<()> {
    let clock = Clock::get()?;
    let twin = &mut ctx.accounts.twin;

    emit!(MemoryExported {
        owner: twin.owner,
        behavioral_hash: twin.behavioral_hash,
        decision_count: twin.decision_count,
        exported_at: clock.unix_timestamp,
    });

    twin.updated_at = clock.unix_timestamp;

    Ok(())
}
