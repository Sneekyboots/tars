/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tars.json`.
 */
export type Tars = {
  address: "JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H";
  metadata: {
    name: "tars";
    version: "0.1.0";
    spec: "0.1.0";
    description: "TARS - Sovereign Memory Protocol";
  };
  instructions: [
    {
      name: "initializeTwin";
      discriminator: [79, 211, 195, 105, 148, 190, 72, 177];
      accounts: [
        { name: "twin"; writable: true; pda: { seeds: [{ kind: "const"; value: [116, 119, 105, 110] }, { kind: "account"; path: "owner" }] } },
        { name: "owner"; writable: true; signer: true },
        { name: "systemProgram"; address: "11111111111111111111111111111111" }
      ];
      args: [];
    },
    {
      name: "logDecision";
      discriminator: [233, 72, 38, 191, 98, 58, 102, 7];
      accounts: [
        { name: "twin"; writable: true },
        { name: "decisionLog"; writable: true },
        { name: "owner"; writable: true; signer: true },
        { name: "systemProgram"; address: "11111111111111111111111111111111" }
      ];
      args: [
        { name: "decision"; type: "string" },
        { name: "context"; type: "string" },
        { name: "deviationScore"; type: "u8" }
      ];
    },
    {
      name: "updatePattern";
      discriminator: [211, 169, 52, 78, 234, 147, 201, 44];
      accounts: [
        { name: "twin"; writable: true },
        { name: "owner"; writable: true; signer: true },
        { name: "systemProgram"; address: "11111111111111111111111111111111" }
      ];
      args: [{ name: "patternVector"; type: { vec: "u64" } }];
    },
    {
      name: "verifyDeviation";
      discriminator: [160, 115, 214, 88, 40, 233, 27, 9];
      accounts: [{ name: "twin" }];
      args: [{ name: "currentPattern"; type: { vec: "u64" } }];
      returns: "u8";
    },
    {
      name: "exportMemory";
      discriminator: [100, 209, 196, 58, 243, 200, 89, 34];
      accounts: [
        { name: "twin"; writable: true },
        { name: "owner"; signer: true }
      ];
      args: [];
    }
  ];
  accounts: [
    { name: "TwinAccount"; discriminator: [244, 205, 3, 100, 17, 88, 49, 200] },
    { name: "DecisionLog"; discriminator: [155, 217, 92, 14, 230, 71, 183, 50] }
  ];
  events: [
    { name: "MemoryExported"; discriminator: [201, 33, 118, 77, 44, 199, 88, 211] }
  ];
  errors: [
    { code: 6000; name: "PatternTooLarge";   msg: "Pattern vector exceeds maximum of 10 entries" },
    { code: 6001; name: "AlreadyInitialized"; msg: "Twin account already initialized" },
    { code: 6002; name: "Unauthorized";       msg: "Unauthorized: caller is not the twin owner" },
    { code: 6003; name: "DecisionTooLong";    msg: "Decision string exceeds 256 characters" },
    { code: 6004; name: "ContextTooLong";     msg: "Context string exceeds 256 characters" },
    { code: 6005; name: "HashingFailed";      msg: "Poseidon hashing syscall failed" },
    { code: 6006; name: "EmptyPattern";       msg: "Pattern vector cannot be empty" }
  ];
  types: [
    {
      name: "TwinAccount";
      type: {
        kind: "struct";
        fields: [
          { name: "owner";          type: "pubkey" },
          { name: "behavioralHash"; type: { array: ["u8", 32] } },
          { name: "patternVector";  type: { vec: "u64" } },
          { name: "decisionCount";  type: "u64" },
          { name: "createdAt";      type: "i64" },
          { name: "updatedAt";      type: "i64" }
        ];
      };
    },
    {
      name: "DecisionLog";
      type: {
        kind: "struct";
        fields: [
          { name: "twin";           type: "pubkey" },
          { name: "decisionHash";   type: { array: ["u8", 32] } },
          { name: "contextHash";    type: { array: ["u8", 32] } },
          { name: "timestamp";      type: "i64" },
          { name: "deviationScore"; type: "u8" }
        ];
      };
    },
    {
      name: "MemoryExported";
      type: {
        kind: "struct";
        fields: [
          { name: "owner";          type: "pubkey" },
          { name: "behavioralHash"; type: { array: ["u8", 32] } },
          { name: "decisionCount";  type: "u64" },
          { name: "exportedAt";     type: "i64" }
        ];
      };
    }
  ];
};
