"""Quick connectivity and config test — safe to delete."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from tars.config import load_config
from tars.embeddings import VaultIndex
import tempfile

cfg = load_config()
print(f"LM Studio URL : {cfg.lm_studio_url}")
print(f"Model         : {cfg.model}")
print(f"Embed model   : {cfg.embed_model!r}")
print(f"Vault path    : {cfg.vault_path}")

with tempfile.TemporaryDirectory() as d:
    idx = VaultIndex(Path(d), cfg.lm_studio_url, cfg.embed_model, cfg.api_key)
    vec = idx._embed("hello world test")
    if vec:
        print(f"Embed test    : OK — {len(vec)}-dim vector")
    else:
        print("Embed test    : FAILED (check lm_studio_url and embed_model in config.yaml)")

# Test LLM connection
from tars.llm import LMStudio
llm = LMStudio(cfg)
ok = llm.ping()
print(f"LLM ping      : {'OK' if ok else 'FAILED'}")
