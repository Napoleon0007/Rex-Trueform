#!/usr/bin/env python
"""Background remover using U^2-Net via onnxruntime directly.

Avoids the rembg package (which hard-imports pymatting -> numba -> llvmlite,
none of which build cleanly on this machine's Python). Downloads the small
u2netp ONNX model once, runs segmentation, and writes a transparent PNG.

Usage: cutout.py <input-image> <output.png>
"""
import sys
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np
from PIL import Image, ImageFilter
import onnxruntime as ort

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx"
MODEL_PATH = Path.home() / ".rembg-venv" / "u2net.onnx"
SIZE = 320
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def ensure_model() -> Path:
    if not MODEL_PATH.exists():
        print("downloading u2netp model…", flush=True)
        urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def predict_mask(img: Image.Image) -> Image.Image:
    sess = ort.InferenceSession(str(ensure_model()), providers=["CPUExecutionProvider"])
    small = img.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    x = np.array(small, dtype=np.float32) / 255.0
    x = (x - MEAN) / STD
    x = x.transpose(2, 0, 1)[None].astype(np.float32)  # NCHW
    out = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    out = (out - out.min()) / (out.max() - out.min() + 1e-8)
    mask = Image.fromarray((out * 255).astype(np.uint8)).resize(img.size, Image.LANCZOS)
    # soften the edge so the composite doesn't look cut with scissors
    return mask.filter(ImageFilter.GaussianBlur(0.6))


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: cutout.py <input> <output.png>")
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    if not src.exists():
        sys.exit(f"input not found: {src}")
    img = Image.open(src).convert("RGBA")
    mask = predict_mask(img)
    img.putalpha(mask)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst)
    print(f"saved {dst} ({img.size[0]}x{img.size[1]})", flush=True)


if __name__ == "__main__":
    main()
