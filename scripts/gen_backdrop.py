#!/usr/bin/env python3
"""Generate the rainforest backdrop for the Rex Casino games table.

Uses Google's Gemini image model ("nano banana") and saves the result to
public/rainforest.png, which the games-table <Backdrop> picks up automatically.

Key lookup order: --key  →  $GEMINI_API_KEY / $GOOGLE_API_KEY  →  ~/.hermes/.env
(GEMINI_API_KEY or GOOGLE_API_KEY). Get a free key at
https://aistudio.google.com/apikey

Usage:
    python3 scripts/gen_backdrop.py --key AIza...
    GEMINI_API_KEY=AIza... python3 scripts/gen_backdrop.py
    python3 scripts/gen_backdrop.py            # reads the key from ~/.hermes/.env
"""
import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROMPT = (
    "A lush, deep emerald rainforest interior seen as a cinematic backdrop. "
    "Dense tropical foliage and tall trees, thick golden volumetric god-rays "
    "streaming diagonally through the canopy, soft mist drifting near the forest "
    "floor. Rich dark greens with warm antique-gold highlights, moody and "
    "luxurious lighting, shallow depth of field with a softly blurred background. "
    "No people, no animals, no text, no watermark. Ultra-detailed, photorealistic, "
    "wide 16:9 cinematic landscape composition, atmospheric and mysterious. Colour "
    "palette of emerald green and antique gold, to match a high-end casino lounge."
)

# Tried in order — newer name first, then the preview alias.
MODELS = ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]

KEY_NAMES = ("GEMINI_API_KEY", "GOOGLE_API_KEY")


def find_key(cli_key: str | None) -> str | None:
    if cli_key:
        return cli_key
    for name in KEY_NAMES:
        if os.environ.get(name):
            return os.environ[name]
    env = Path.home() / ".hermes" / ".env"
    if env.exists():
        for raw in env.read_text().splitlines():
            line = raw.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            if key.strip() in KEY_NAMES:
                return val.strip().strip('"').strip("'")
    return None


def generate(api_key: str, model: str, prompt: str) -> bytes:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    payload = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["IMAGE"]},
        }
    ).encode()
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.load(resp)
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError("no image in response: " + json.dumps(data)[:600])


def main() -> None:
    default_out = Path(__file__).resolve().parent.parent / "public" / "rainforest.png"
    ap = argparse.ArgumentParser(description="Generate the casino rainforest backdrop.")
    ap.add_argument("--key", help="Gemini / Google AI Studio API key")
    ap.add_argument("--out", default=str(default_out), help="output PNG path")
    ap.add_argument("--prompt", default=PROMPT, help="override the image prompt")
    args = ap.parse_args()

    api_key = find_key(args.key)
    if not api_key:
        sys.exit(
            "No Gemini key found. Pass --key, set GEMINI_API_KEY, or add it to "
            "~/.hermes/.env. Get one free at https://aistudio.google.com/apikey"
        )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    last_err = None
    for model in MODELS:
        try:
            print(f"… generating with {model}")
            png = generate(api_key, model, args.prompt)
            out.write_bytes(png)
            print(f"✓ saved {out}  ({len(png) // 1024} KB)")
            return
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")[:400]
            last_err = f"{model}: HTTP {e.code} — {body}"
            print(f"  ! {last_err}")
        except Exception as e:  # noqa: BLE001 — report and try the next model
            last_err = f"{model}: {e}"
            print(f"  ! {last_err}")

    sys.exit(f"All models failed. Last error:\n{last_err}")


if __name__ == "__main__":
    main()
