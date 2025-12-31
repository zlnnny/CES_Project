# top_assets.py
# Build top-k asset summary for ALL people
# output: data/topk_assets.json

import json, os, argparse

BASE_DIR = "./data"

WEIGHT_JSON = os.path.join(BASE_DIR, "weights.json")
ASSETS_JSON = os.path.join(BASE_DIR, "assets.json")
PEOPLE_JSON = os.path.join(BASE_DIR, "people.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "topk_assets.json")


# ----------------------------
# Loaders
# ----------------------------
def load():
    with open(WEIGHT_JSON, "r", encoding="utf-8") as f:
        W = json.load(f)

    with open(ASSETS_JSON, "r", encoding="utf-8") as f:
        A = {a["asset_id"]: a for a in json.load(f)["assets"]}

    with open(PEOPLE_JSON, "r", encoding="utf-8") as f:
        P = {p["entity_id"]: p for p in json.load(f)["people"]}

    return W, A, P


# ----------------------------
# Build top-k per person
# ----------------------------
def build_topk(W, A, k):
    result = {}

    for pid, edges in W.items():
        if not edges:
            continue

        # edges: { asset_id: {value, last} }
        sorted_items = sorted(
            edges.items(),
            key=lambda kv: kv[1].get("value", 0.0),
            reverse=True
        )[:k]

        top_assets = []
        for aid, meta in sorted_items:
            asset = A.get(aid)
            if not asset:
                continue

            top_assets.append({
                "asset_id": aid,
                "symbol": asset.get("symbol", "").lower(),
                "name": asset.get("name", "").lower(),
                "weight": round(meta.get("value", 0.0), 6)
            })

        if top_assets:
            result[pid] = top_assets

    return result


# ----------------------------
# Main
# ----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=10, help="top-k assets per person")
    args = ap.parse_args()

    W, A, P = load()
    topk = build_topk(W, A, args.k)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(topk, f, indent=2, ensure_ascii=False)

    print(f"[top_assets] saved top-{args.k} assets for {len(topk)} people → {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
