#!/usr/bin/env python3
"""GSC Performance Ratchet: Track Search Console rank and CTR progression against the Oct 11 baseline.

Usage:
    python scripts/gsc_performance_ratchet.py
    python scripts/gsc_performance_ratchet.py --latest path/to/latest_queries.csv --markdown out.md
"""
from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE_CSV = ROOT / "search_console_reports" / "11-oct-2026" / "Queries.csv"


@dataclass
class QueryRecord:
    query: str
    clicks: int
    impressions: int
    ctr_percent: float
    position: float


def load_gsc_csv(csv_path: Path) -> dict[str, QueryRecord]:
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}", file=sys.stderr)
        return {}

    records: dict[str, QueryRecord] = {}
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            query = row.get("Top queries", "").strip()
            if not query:
                continue
            try:
                clicks = int(row.get("Clicks", 0))
                impressions = int(row.get("Impressions", 0))
                ctr_str = row.get("CTR", "0%").replace("%", "").strip()
                ctr = float(ctr_str) if ctr_str else 0.0
                position = float(row.get("Position", 0.0))
            except ValueError:
                continue

            records[query] = QueryRecord(
                query=query,
                clicks=clicks,
                impressions=impressions,
                ctr_percent=ctr,
                position=position,
            )
    return records


def analyze_clusters(records: dict[str, QueryRecord]) -> dict:
    tier1_page1_leaks: list[QueryRecord] = []
    tier2_striking_distance: list[QueryRecord] = []
    tier3_high_volume_targets: list[QueryRecord] = []

    for r in records.values():
        if r.position <= 10.0 and r.impressions >= 50 and r.ctr_percent < 2.0:
            tier1_page1_leaks.append(r)
        elif 10.0 < r.position <= 20.0 and r.impressions >= 100:
            tier2_striking_distance.append(r)
        elif 20.0 < r.position <= 50.0 and r.impressions >= 200:
            tier3_high_volume_targets.append(r)

    tier1_page1_leaks.sort(key=lambda x: x.impressions, reverse=True)
    tier2_striking_distance.sort(key=lambda x: x.position)
    tier3_high_volume_targets.sort(key=lambda x: x.impressions, reverse=True)

    return {
        "tier1": tier1_page1_leaks,
        "tier2": tier2_striking_distance,
        "tier3": tier3_high_volume_targets,
    }


def compare_records(
    baseline: dict[str, QueryRecord], latest: dict[str, QueryRecord]
) -> list[dict]:
    comparison = []
    for q, b in baseline.items():
        if q in latest:
            l = latest[q]
            pos_delta = b.position - l.position  # positive is improvement (lower rank number)
            ctr_delta = l.ctr_percent - b.ctr_percent
            clicks_delta = l.clicks - b.clicks
            comparison.append(
                {
                    "query": q,
                    "baseline_pos": b.position,
                    "latest_pos": l.position,
                    "pos_delta": pos_delta,
                    "baseline_ctr": b.ctr_percent,
                    "latest_ctr": l.ctr_percent,
                    "ctr_delta": ctr_delta,
                    "baseline_clicks": b.clicks,
                    "latest_clicks": l.clicks,
                    "clicks_delta": clicks_delta,
                    "impressions": l.impressions,
                }
            )
    comparison.sort(key=lambda x: x["pos_delta"], reverse=True)
    return comparison


def main() -> int:
    parser = argparse.ArgumentParser(description="GSC Performance Ratchet")
    parser.add_argument(
        "--latest",
        type=Path,
        default=BASELINE_CSV,
        help="Path to latest Queries.csv export",
    )
    parser.add_argument(
        "--markdown",
        type=Path,
        default=None,
        help="Optional path to write markdown summary",
    )
    args = parser.parse_args()

    baseline = load_gsc_csv(BASELINE_CSV)
    latest = load_gsc_csv(args.latest)

    if not baseline:
        print("Failed to load baseline data.", file=sys.stderr)
        return 1

    print(f"Loaded {len(baseline)} queries from baseline ({BASELINE_CSV.name}).")
    if args.latest != BASELINE_CSV:
        print(f"Loaded {len(latest)} queries from latest report ({args.latest.name}).")

    clusters = analyze_clusters(latest if args.latest != BASELINE_CSV else baseline)

    print("\n" + "=" * 80)
    print("TIER 1: PAGE 1 CTR LEAKS (Pos <= 10.0, Impr >= 50, CTR < 2%)")
    print("=" * 80)
    for r in clusters["tier1"]:
        print(
            f"  * {r.query:<35} | Pos: {r.position:4.1f} | Impr: {r.impressions:5d} | CTR: {r.ctr_percent:4.1f}% | Clicks: {r.clicks}"
        )

    print("\n" + "=" * 80)
    print("TIER 2: STRIKING DISTANCE (Pos 10.1 - 20.0, Impr >= 100)")
    print("=" * 80)
    for r in clusters["tier2"]:
        print(
            f"  * {r.query:<35} | Pos: {r.position:4.1f} | Impr: {r.impressions:5d} | CTR: {r.ctr_percent:4.1f}% | Clicks: {r.clicks}"
        )

    print("\n" + "=" * 80)
    print("TIER 3: HIGH-VOLUME PAGE 3-4 TARGETS (Pos 20.1 - 50.0, Impr >= 200)")
    print("=" * 80)
    for r in clusters["tier3"]:
        print(
            f"  * {r.query:<35} | Pos: {r.position:4.1f} | Impr: {r.impressions:5d} | CTR: {r.ctr_percent:4.1f}% | Clicks: {r.clicks}"
        )

    if args.latest != BASELINE_CSV:
        comp = compare_records(baseline, latest)
        improved = [c for c in comp if c["pos_delta"] > 0]
        regressed = [c for c in comp if c["pos_delta"] < -1.0]
        print("\n" + "=" * 80)
        print(f"PROGRESSION SUMMARY: {len(improved)} improved, {len(regressed)} regressed")
        print("=" * 80)

    if args.markdown:
        with open(args.markdown, mode="w", encoding="utf-8") as md:
            md.write("# GSC Performance Ratchet Report\n\n")
            md.write(f"Analyzed {len(latest)} queries against baseline.\n\n")
            md.write("## Tier 1: Page 1 CTR Leaks (Immediate Conversion Priority)\n\n")
            md.write("| Query | Position | Impressions | CTR | Clicks |\n| :--- | :---: | :---: | :---: | :---: |\n")
            for r in clusters["tier1"]:
                md.write(f"| `{r.query}` | {r.position:.1f} | {r.impressions} | {r.ctr_percent:.1f}% | {r.clicks} |\n")
            md.write("\n## Tier 2: Striking Distance Queries (Page 2 to Page 1 Targets)\n\n")
            md.write("| Query | Position | Impressions | CTR | Clicks |\n| :--- | :---: | :---: | :---: | :---: |\n")
            for r in clusters["tier2"]:
                md.write(f"| `{r.query}` | {r.position:.1f} | {r.impressions} | {r.ctr_percent:.1f}% | {r.clicks} |\n")
        print(f"\nMarkdown report written to {args.markdown}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
