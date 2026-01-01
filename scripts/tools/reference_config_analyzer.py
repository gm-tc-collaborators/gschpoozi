#!/usr/bin/env python3
"""
reference_config_analyzer.py

Parses Klipper-style .cfg files (single-file configs) and produces:
- a per-config inventory of sections + keys
- a cross-config frequency table (sections, keys)
- a lightweight "feature" summary (kinematics, leveling method, multi-mcu, etc.)

This is intentionally *lossy*: we don't attempt to fully parse gcode blocks or
Klipper expressions; we only need structural coverage.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


SECTION_RE = re.compile(r"^\s*\[(?P<section>[^\]]+)\]\s*$")
KEY_RE = re.compile(r"^\s*(?P<key>[A-Za-z0-9_]+)\s*:\s*(?P<value>.*)\s*$")


def _is_comment_or_blank(line: str) -> bool:
    s = line.strip()
    return not s or s.startswith("#") or s.startswith(";")


def _normalize_section_name(raw: str) -> str:
    # Preserve section names largely as-is, but trim internal whitespace.
    return " ".join(raw.strip().split())


@dataclass(frozen=True)
class ParsedConfig:
    file: str
    line_count: int
    sections: Dict[str, List[str]]  # section -> sorted keys
    section_order: List[str]  # encountered order (deduped)
    includes: List[str]
    features: Dict[str, Any]


def parse_cfg_text(text: str, filename: str = "<memory>") -> ParsedConfig:
    current_section: Optional[str] = None
    section_keys: Dict[str, Set[str]] = {}
    section_order: List[str] = []
    includes: List[str] = []

    lines = text.splitlines()

    for raw in lines:
        if _is_comment_or_blank(raw):
            continue

        m_sec = SECTION_RE.match(raw)
        if m_sec:
            current_section = _normalize_section_name(m_sec.group("section"))
            if current_section not in section_keys:
                section_keys[current_section] = set()
                section_order.append(current_section)
            # Special-case: [include foo.cfg]
            if current_section.lower().startswith("include "):
                includes.append(current_section[len("include ") :].strip())
            continue

        # Key/value lines (we only record key names)
        m_key = KEY_RE.match(raw)
        if m_key and current_section:
            key = m_key.group("key")
            section_keys.setdefault(current_section, set()).add(key)
            continue

        # Otherwise: continuation line (e.g. gcode blocks) or something we ignore
        continue

    sections_sorted: Dict[str, List[str]] = {
        sec: sorted(keys) for sec, keys in section_keys.items()
    }
    features = derive_features(sections_sorted)

    return ParsedConfig(
        file=filename,
        line_count=len(lines),
        sections=sections_sorted,
        section_order=section_order,
        includes=includes,
        features=features,
    )


def derive_features(sections: Dict[str, List[str]]) -> Dict[str, Any]:
    sec_names = set(sections.keys())

    def has(prefix: str) -> bool:
        return any(s.lower().startswith(prefix.lower()) for s in sec_names)

    # Kinematics is usually in [printer] but reading values would require parsing values.
    # We infer a few big features from section presence.
    leveling = "none"
    if "quad_gantry_level" in sec_names:
        leveling = "qgl"
    elif "z_tilt" in sec_names:
        leveling = "z_tilt"
    elif "bed_mesh" in sec_names:
        leveling = "bed_mesh"

    z_motors = 1
    if "stepper_z3" in sec_names:
        z_motors = 4
    elif "stepper_z2" in sec_names:
        z_motors = 3
    elif "stepper_z1" in sec_names:
        z_motors = 2

    multi_mcu = any(s.startswith("mcu ") for s in sec_names)
    tmc = has("tmc")
    idex = "dual_carriage" in sec_names or "dual_carriage stepper_x" in sec_names

    return {
        "leveling": leveling,
        "z_motors": z_motors,
        "multi_mcu": multi_mcu,
        "has_tmc": tmc,
        "idex": idex,
    }


def iter_cfg_files(input_dir: Path) -> List[Path]:
    return sorted([p for p in input_dir.glob("*.cfg") if p.is_file()])


def build_matrix(parsed: List[ParsedConfig]) -> Dict[str, Any]:
    # Section frequency
    section_counts: Dict[str, int] = {}
    # Key frequency per section
    section_key_counts: Dict[str, Dict[str, int]] = {}

    for pc in parsed:
        for sec, keys in pc.sections.items():
            section_counts[sec] = section_counts.get(sec, 0) + 1
            sk = section_key_counts.setdefault(sec, {})
            for k in keys:
                sk[k] = sk.get(k, 0) + 1

    # Sort for stable output
    section_counts_sorted = dict(
        sorted(section_counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))
    )
    section_key_counts_sorted = {
        sec: dict(sorted(kc.items(), key=lambda kv: (-kv[1], kv[0].lower())))
        for sec, kc in sorted(section_key_counts.items(), key=lambda kv: kv[0].lower())
    }

    return {
        "configs": [asdict(p) for p in parsed],
        "summary": {
            "config_count": len(parsed),
            "sections_by_frequency": section_counts_sorted,
            "keys_by_section_frequency": section_key_counts_sorted,
        },
    }


def render_markdown(matrix: Dict[str, Any]) -> str:
    configs = matrix["configs"]
    summary = matrix["summary"]
    sections_by_freq = summary["sections_by_frequency"]

    lines: List[str] = []
    lines.append("# Reference config capability matrix")
    lines.append("")
    lines.append(
        f"Configs analyzed: **{summary['config_count']}** (from `reference-configs/*.cfg`)"
    )
    lines.append("")

    lines.append("## Per-config feature summary")
    lines.append("")
    lines.append("| config | lines | leveling | z_motors | multi_mcu | has_tmc | idex |")
    lines.append("|---|---:|---|---:|---:|---:|---:|")
    for c in configs:
        f = c["features"]
        lines.append(
            f"| `{c['file']}` | {c['line_count']} | {f.get('leveling')} | {f.get('z_motors')} | "
            f"{'yes' if f.get('multi_mcu') else 'no'} | {'yes' if f.get('has_tmc') else 'no'} | "
            f"{'yes' if f.get('idex') else 'no'} |"
        )
    lines.append("")

    lines.append("## Section frequency (how many configs include a section)")
    lines.append("")
    lines.append("| section | count |")
    lines.append("|---|---:|")
    for sec, count in sections_by_freq.items():
        lines.append(f"| `{sec}` | {count} |")
    lines.append("")

    lines.append("## Notes")
    lines.append("")
    lines.append("- This analysis is **structural** (sections/keys). It intentionally ignores values.")
    lines.append("- `gcode:` bodies and macro scripts are not parsed; we only record that the key exists.")
    lines.append("")

    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--input",
        default="reference-configs",
        help="Directory containing reference .cfg files",
    )
    ap.add_argument(
        "--out-json",
        default="reference-configs/matrix.json",
        help="Write matrix JSON here (relative to repo root)",
    )
    ap.add_argument(
        "--out-md",
        default="docs/reference-config-matrix.md",
        help="Write markdown summary here (relative to repo root)",
    )
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    input_dir = (repo_root / args.input).resolve()
    out_json = (repo_root / args.out_json).resolve()
    out_md = (repo_root / args.out_md).resolve()

    cfg_files = iter_cfg_files(input_dir)
    parsed: List[ParsedConfig] = []
    for p in cfg_files:
        text = p.read_text(encoding="utf-8", errors="replace")
        parsed.append(parse_cfg_text(text, filename=p.name))

    matrix = build_matrix(parsed)

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_md.parent.mkdir(parents=True, exist_ok=True)

    out_json.write_text(json.dumps(matrix, indent=2, sort_keys=True), encoding="utf-8")
    out_md.write_text(render_markdown(matrix), encoding="utf-8")

    print(f"Wrote: {out_json.relative_to(repo_root)}")
    print(f"Wrote: {out_md.relative_to(repo_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

