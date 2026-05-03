use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod tars {
    use super::*;

    pub fn initialize_twin(ctx: Context<InitializeTwin>) -> Result<()> {
        initialize_twin::handler(ctx)
    }

    pub fn log_decision(
        ctx: Context<LogDecision>,
        decision: String,
        context: String,
        deviation_score: u8,
    ) -> Result<()> {
        log_decision::handler(ctx, decision, context, deviation_score)
    }

    pub fn update_pattern(
        ctx: Context<UpdatePattern>,
        pattern_vector: Vec<u64>,
    ) -> Result<()> {
        update_pattern::handler(ctx, pattern_vector)
    }

    pub fn verify_deviation(
        ctx: Context<VerifyDeviation>,
        current_pattern: Vec<u64>,
    ) -> Result<u8> {
        verify_deviation::handler(ctx, current_pattern)
    }

    pub fn export_memory(ctx: Context<ExportMemory>) -> Result<()> {
        export_memory::handler(ctx)
    }
}
