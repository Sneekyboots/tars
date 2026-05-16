from __future__ import annotations

import yaml
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class Config:
    vault_path: str = "~/Documents/Obsidian"
    lm_studio_url: str = "http://localhost:1234/v1"
    model: str = "gemma-4-e4b"
    tars_folder: str = "TARS"
    temperature: float = 0.7
    stream: bool = True
    api_key: str = ""  # set in config.yaml if LM Studio has auth enabled
    embed_model: str = ""  # optional: embedding model for semantic search


def load_config(config_path: Optional[Path] = None) -> Config:
    if config_path is None:
        config_path = Path(__file__).parent.parent / "config.yaml"

    if not config_path.exists():
        return Config()

    with open(config_path) as f:
        data = yaml.safe_load(f) or {}

    defaults = Config()
    return Config(
        vault_path=data.get("vault_path", defaults.vault_path),
        lm_studio_url=data.get("lm_studio_url", defaults.lm_studio_url),
        model=data.get("model", defaults.model),
        tars_folder=data.get("tars_folder", defaults.tars_folder),
        temperature=float(data.get("temperature", defaults.temperature)),
        stream=bool(data.get("stream", defaults.stream)),
        api_key=str(data.get("api_key", defaults.api_key)),
        embed_model=str(data.get("embed_model", defaults.embed_model)),
    )
