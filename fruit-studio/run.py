#!/usr/bin/env python
"""Point d'entrée CLI.

    python run.py --dry-run                         # pipeline complet, 0 €, fichiers placeholder
    python run.py --dry-run --project demo          # reprend le projet « demo » là où il s'est arrêté
    python run.py --dry-run --regen s2_1,s2_3       # régénère uniquement ces plans
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path

from studio.config import load_settings
from studio.costs import load_pricing
from studio.errors import StudioError
from studio.logging_setup import setup_logging
from studio.models import dump_json, load_characters, load_script
from studio.pipeline import Pipeline
from studio.providers.registry import build_providers
from studio.script_gen import estimate_llm_cost, generate_script_llm
from studio.state import STEPS

log = logging.getLogger("run")


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Génère une vidéo TikTok narrative (fruits 3D).")
    p.add_argument("--dry-run", action="store_true", help="providers placeholder, aucun appel payant")
    p.add_argument("--project", help="nom du projet (dossier dans projects/). Défaut: dry-run ou horodaté")
    p.add_argument("--script", type=Path, default=None, help="scénario JSON (défaut: examples/sample_script.json)")
    p.add_argument("--llm", metavar="IDÉE", help="génère le scénario avec OpenAI (payant, demande confirmation)")
    p.add_argument("--music", type=Path, default=None, help="fichier musique (défaut: 1er fichier de assets/music)")
    p.add_argument("--from-step", choices=STEPS, help="relance à partir de cette étape")
    p.add_argument("--regen", help="plans à régénérer, séparés par des virgules (ex: s2_1,s2_3)")
    p.add_argument("--approve-usd", type=float, default=0.0, help="budget payant validé pour ce projet (USD)")
    p.add_argument("--voice-engine", choices=["auto", "edge", "babble"], default="auto",
                   help="dry-run: auto = Edge-TTS puis repli hors-ligne; edge = Edge-TTS obligatoire; babble = hors-ligne")
    p.add_argument("--size", default=None, help="résolution LxH (défaut 1080x1920) — surtout pour les tests rapides")
    p.add_argument("-v", "--verbose", action="store_true")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    settings = load_settings()
    if args.size:
        m = re.fullmatch(r"(\d+)x(\d+)", args.size)
        if not m:
            print("--size attend le format LxH, ex: 540x960", file=sys.stderr)
            return 2
        settings = settings.with_size(int(m.group(1)), int(m.group(2)))
    log_file = setup_logging(settings.logs_dir, args.verbose)

    try:
        providers = build_providers(settings, args.dry_run, args.voice_engine)
        characters = load_characters(settings.characters_dir)

        project = args.project or ("dry-run" if args.dry_run else "projet")
        project_dir = settings.projects_dir / project

        if args.llm:
            pricing = load_pricing(settings.pricing_file)
            est = estimate_llm_cost(pricing)
            print(f"Appel PAYANT OpenAI ({settings.openai_script_model}) — coût estimé ≈ {est:.3f} $ (indicatif).")
            if input("Tape OK pour valider cette dépense : ").strip() != "OK":
                print("Annulé, rien n'a été dépensé.")
                return 1
            script = generate_script_llm(args.llm, characters, settings)
            dump_json(project_dir / "script.llm.json", script.model_dump())
        else:
            script = load_script(args.script or settings.root / "examples" / "sample_script.json")
        script.validate_against(characters)

        pipe = Pipeline(settings, project_dir, providers, script, characters, music=args.music,
                        approved_usd=args.approve_usd)
        if args.regen:
            pipe.regen([s.strip() for s in args.regen.split(",") if s.strip()])
        report = pipe.run(from_step=args.from_step)
    except StudioError as exc:
        log.error("%s", exc)
        print(f"\nÉCHEC: {exc}\n(journal: {log_file})", file=sys.stderr)
        return 1

    print("\n=== Résultat ===")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nJournal: {log_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
