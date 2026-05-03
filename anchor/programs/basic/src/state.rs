use anchor_lang::prelude::*;

pub const MAX_PATTERN_ENTRIES: usize = 10;
pub const MAX_STRING_LEN: usize = 256;

#[account]
#[derive(InitSpace)]
pub struct TwinAccount {
    pub owner: Pubkey,
    pub behavioral_hash: [u8; 32],
    #[max_len(10)]
    pub pattern_vector: Vec<u64>,
    pub decision_count: u64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct DecisionLog {
    pub twin: Pubkey,
    pub decision_hash: [u8; 32],
    pub context_hash: [u8; 32],
    pub timestamp: i64,
    pub deviation_score: u8,
}

#[event]
pub struct MemoryExported {
    pub owner: Pubkey,
    pub behavioral_hash: [u8; 32],
    pub decision_count: u64,
    pub exported_at: i64,
}
