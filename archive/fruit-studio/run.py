#!/usr/bin/env python
"""Point d'entrée CLI.

    python run.py --dry-run                              # pipeline complet, 0 €, fichiers placeholder
    python run.py --script examples/script_1.json --project j2 --plan --until images
                                                         # estimation GRATUITE des appels payants
    python run.py --script examples/script_1.json --project j2 --until images --only-shots s1_1,s2_1,s3_4
                                                         # Jalon 2 : vrais appels fal, après ton « OK »
    python run.py --dry-run --regen s2_1,s2_3            # régénère uniquement ces plans
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path

from studio.config import load_settings
from studio.costs import CostGuard, CostLedger, load_pricing
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
    p.add_argument("--project", help="nom du projet (dossier dans projects/). Défaut: dry-run ou projet")
    p.add_argument("--script", type=Path, default=None, help="scénario JSON (défaut: examples/script_1.json)")
    p.add_argument("--llm", metavar="IDÉE", help="génère le scénario avec OpenAI (payant, demande confirmation)")
    p.add_argument("--music", type=Path, default=None, help="fichier musique (défaut: 1er fichier de assets/music)")
    p.add_argument("--from-step", choices=STEPS, help="relance à partir de cette étape")
    p.add_argument("--until", choices=STEPS, help="s'arrête après cette étape")
    p.add_argument("--only-shots", help="ne traite que ces plans (ex: s1_1,s2_1) ; jusqu'à l'étape images")
    p.add_argument("--regen", help="plans à régénérer, séparés par des virgules (ex: s2_1,s2_3)")
    p.add_argument("--plan", action="store_true", help="affiche les appels payants prévus et leur coût, sans rien générer")
    p.add_argument("--approve-usd", type=float, default=0.0,
                   help="valide d'avance cette dépense (USD) pour CETTE exécution, sans question interactive")
    p.add_argument("--voice-engine", choices=["auto", "edge", "babble"], default="auto",
                   help="dry-run: auto = Edge-TTS puis repli hors-ligne; edge = Edge-TTS obligatoire; babble = hors-ligne")
    p.add_argument("--size", default=None, help="résolution LxH (défaut 1080x1920) — surtout pour les tests rapides")
    p.add_argument("-v", "--verbose", action="store_true")
    return p.parse_args(argv)


def print_plan(plan: dict) -> None:
    print("\n=== Appels payants prévus ===")
    paid = [i for i in plan["items"] if i["usd"] > 0]
    for i in paid:
        print(f"  {i['usd']:.3f} $  {i['kind']:<6} {i['label']}  [{i['provider']}]")
    if not paid:
        print("  (aucun : tout est déjà généré)")
    print(f"  Total estimé            : {plan['total_usd']:.3f} $   (avec marge de sécurité 15 % : {plan['total_with_margin_usd']:.3f} $)")
    print(f"  Déjà dépensé (global)   : {plan['spent_global_usd']:.3f} $ sur un plafond de {plan['cap_usd']:.2f} $")
    print(f"  Reste après cette étape : {plan['remaining_after_usd']:.3f} $")
    print("  Prix = estimations NON VÉRIFIÉES (config/pricing.json). La facture réelle est sur le tableau de bord du fournisseur.\n")


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
            script = load_script(args.script or settings.root / "examples" / "script_1.json")
        script.validate_against(characters)

        only = {s.strip() for s in args.only_shots.split(",") if s.strip()} if args.only_shots else None
        if only:
            unknown = only - {sh.id for _, sh in script.shots()}
            if unknown:
                raise StudioError(f"--only-shots: plan(s) inconnu(s) {sorted(unknown)}")

        global_ledger = CostLedger(settings.projects_dir / "_budget.jsonl")
        pipe = Pipeline(settings, project_dir, providers, script, characters, music=args.music,
                        only_shots=only, global_ledger=global_ledger)
        if args.regen:
            pipe.regen([s.strip() for s in args.regen.split(",") if s.strip()])

        if not args.dry_run and not args.until:
            args.until = "images"  # voix et vidéo réelles : Jalon 3
            print("Mode réel : arrêt après l'étape « images » (voix et vidéo réelles = Jalon 3).")
        if not args.dry_run or args.plan:
            plan = pipe.plan(args.until or "images")
            print_plan(plan)
            if args.plan:
                return 0
            if plan["total_usd"] > 0:
                needed = plan["total_with_margin_usd"]
                if plan["remaining_after_usd"] < 0:
                    raise StudioError(f"cette étape dépasserait le plafond global de {settings.max_budget_usd:.2f} $. Arrêt.")
                if args.approve_usd:
                    approved = args.approve_usd
                    if approved + 1e-9 < needed:
                        raise StudioError(f"--approve-usd {approved:.3f} < {needed:.3f} $ nécessaires (marge incluse).")
                else:
                    if input(f"Tape OK pour dépenser jusqu'à {needed:.3f} $ : ").strip() != "OK":
                        print("Annulé, rien n'a été dépensé.")
                        return 1
                    approved = needed
                pipe.set_run_budget(approved)
        report = pipe.run(from_step=args.from_step, until=args.until)
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
