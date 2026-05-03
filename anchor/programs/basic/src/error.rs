use anchor_lang::prelude::*;

#[error_code]
pub enum TarsError {
    #[msg("Pattern vector exceeds maximum of 10 entries")]
    PatternTooLarge,
    #[msg("Twin account already initialized")]
    AlreadyInitialized,
    #[msg("Unauthorized: caller is not the twin owner")]
    Unauthorized,
    #[msg("Decision string exceeds 256 characters")]
    DecisionTooLong,
    #[msg("Context string exceeds 256 characters")]
    ContextTooLong,
    #[msg("Poseidon hashing syscall failed")]
    HashingFailed,
    #[msg("Pattern vector cannot be empty")]
    EmptyPattern,
}
