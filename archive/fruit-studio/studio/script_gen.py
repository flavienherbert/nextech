"""Scénario : fichier JSON d'exemple, ou génération par LLM (OpenAI).

La génération LLM est NON TESTÉE : aucune clé OpenAI n'était disponible pendant le développement.
"""
from __future__ import annotations

import json
import logging
import os

from .config import Settings
from .errors import ScriptError
from .models import Character, Script

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu écris des scénarios de vidéos TikTok verticales (3 scènes, univers prison / tribunal / suspense)
dont les personnages sont des fruits anthropomorphes en animation 3D. Réponds UNIQUEMENT avec un objet JSON valide.

Schéma exact :
{"title": str, "language": "fr", "style": str,
 "scenes": [{"id": str, "title": str, "location": str,
   "shots": [{"id": str (unique), "visual": str (en anglais, ce que montre l'image),
              "motion": str (en anglais, mouvement de caméra), "characters": [id...],
              "lines": [{"speaker": id, "text": str (français, 1-2 phrases), "emotion": str}]}]}]}

Règles : hook très fort dans les 3 premières secondes, 3 scènes, 3 à 5 plans par scène, rebondissement final.
Émotions autorisées : neutre, colère, peur, panique, tristesse, joie, surprise, sarcasme, menace, calme, suspense.
Les « speaker » et « characters » doivent être des identifiants de la liste fournie (ou « narrateur »)."""


def estimate_llm_cost(pricing: dict) -> float:
    return float(pricing["llm"]["openai-script"]["usd_per_script"])


def generate_script_llm(idea: str, characters: dict[str, Character], settings: Settings,
                        target_seconds: int = 50) -> Script:
    """Appel payant : l'appelant doit avoir obtenu la validation explicite de l'utilisateur."""
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ScriptError("OPENAI_API_KEY absente de .env : impossible de générer le scénario par LLM.")
    from openai import OpenAI  # import tardif : dépendance optionnelle

    cast = "\n".join(f"- {c.id}: {c.name} ({c.fruit}), {c.personality}" for c in characters.values())
    client = OpenAI(api_key=key)
    resp = client.chat.completions.create(
        model=settings.openai_script_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Idée : {idea}\nDurée parlée visée : ~{target_seconds} s "
                                        f"(≈ {target_seconds * 14} caractères de dialogue).\nPersonnages :\n{cast}"},
        ],
    )
    raw = resp.choices[0].message.content or ""
    try:
        script = Script.model_validate_json(raw)
        script.validate_against(characters)
    except (ValueError, ScriptError) as exc:
        log.error("réponse LLM invalide: %s", json.dumps(raw)[:500])
        raise ScriptError(f"le LLM a renvoyé un scénario invalide: {exc}") from exc
    return script
