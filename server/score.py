# score.py
import json
import os
import math
import argparse
from datetime import datetime

# ✅ module imports
from preprocess import run_preprocess

# ============================
# Paths
# ============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

WEIGHTS_PATH = os.path.join(DATA_DIR, "weights.json")
EMBED_PATH   = os.path.join(DATA_DIR, "embeddings.json")
PEOPLE_PATH  = os.path.join(DATA_DIR, "people.json")
ASSETS_PATH  = os.path.join(DATA_DIR, "assets.json")

# ============================
# Hyperparameters (UNCHANGED)
# ============================
ALPHA = 0.3
BETA = 0.6
HALF_LIFE = 24

# ============================
# Math helpers (UNCHANGED)
# ============================
def decay(h):
    return math.exp(-math.log(2) * h / HALF_LIFE)

def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))

# ============================
# IO helpers
# ============================
def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

# ============================
# INIT MODE (✅ NEW)
# ============================
def init_weights(verbose=True):
    people = load_json(PEOPLE_PATH, {}).get("people", [])
    assets = load_json(ASSETS_PATH, {}).get("assets", [])

    now = datetime.utcnow().isoformat()
    weights = {}

    for p in people:
        pid = p["entity_id"]
        weights[pid] = {}
        for a in assets:
            aid = a["asset_id"]
            weights[pid][aid] = {
                "value": 0.0,
                "last": now
            }

    save_json(WEIGHTS_PATH, weights)

    if verbose:
        print(
            f"[init] initialized weights: "
            f"{len(people)} people × {len(assets)} assets"
        )

# ============================
# Core scoring logic (UNCHANGED)
# ============================
def run_score(verbose=True):
    if verbose:
        print("[score] start full pipeline")

    # 🔹 1. run preprocess as module (this internally runs crawler)
    events = run_preprocess(verbose=verbose, save_json=True)

    if verbose:
        print(f"[score] received {len(events)} new events")

    if not events:
        if verbose:
            print("[score] no new events → skip scoring")
        return

    # 🔹 2. load existing weights + embeddings
    weights = load_json(WEIGHTS_PATH, {})
    emb_raw = load_json(EMBED_PATH, {})
    embeds = emb_raw.get("assets", {})

    now = datetime.utcnow()

    # 🔹 3. scoring (UNCHANGED LOGIC)
    for e in events:
        pid = e["person_id"]
        aid = e["asset_id"]
        s   = float(e["strength"])

        if aid not in embeds:
            if verbose:
                print(f"[score]   skip unknown asset embedding: {aid}")
            continue

        weights.setdefault(pid, {})

        prev = weights[pid].get(
            aid,
            {"value": 0.0, "last": now.isoformat()}
        )

        last = datetime.fromisoformat(prev["last"])
        h = (now - last).total_seconds() / 3600

        base = min(
            1.0,
            prev["value"] * decay(h) + ALPHA * s
        )

        weights[pid][aid] = {
            "value": round(base, 6),
            "last": now.isoformat()
        }

        if verbose:
            print(f"[score]   direct update {pid} → {aid} (Δ={ALPHA*s:.3f})")

        # 🔹 propagation (UNCHANGED)
        for aid2, v2 in embeds.items():
            if aid2 == aid:
                continue

            sim = max(
                0.0,
                cosine(
                    embeds[aid]["embedding"],
                    v2["embedding"]
                )
            )

            if sim <= 0:
                continue

            prev2 = weights[pid].get(
                aid2,
                {"value": 0.0, "last": now.isoformat()}
            )

            base2 = min(
                1.0,
                prev2["value"] * decay(h) + ALPHA * BETA * s * sim
            )

            weights[pid][aid2] = {
                "value": round(base2, 6),
                "last": now.isoformat()
            }

            if verbose:
                print(
                    f"[score]     propagate {aid} → {aid2} "
                    f"(sim={sim:.3f}, Δ={ALPHA*BETA*s*sim:.3f})"
                )

    # 🔹 4. persist weights (for inspection)
    save_json(WEIGHTS_PATH, weights)

    if verbose:
        print("[score] weights.json updated")
        print("[score] pipeline finished")

# ============================
# CLI entry (✅ EXTENDED)
# ============================
if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "init"])
    args = ap.parse_args()

    if args.cmd == "init":
        init_weights(verbose=True)
    else:
        run_score(verbose=True)
