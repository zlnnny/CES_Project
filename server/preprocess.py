# preprocess.py
import json
import os
import torch
import hashlib
from datetime import datetime
from transformers import AutoTokenizer, AutoModel
from torch import nn

from crawler import run_crawler  # ✅ module import (no file dependency)

# ============================
# Paths & Constants
# ============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

EVENTS_PATH = os.path.join(DATA_DIR, "events.json")
PEOPLE_PATH = os.path.join(DATA_DIR, "people.json")

MODEL = "bert-base-uncased"
MAX_ARTICLE_STRENGTH = 0.6   # saturation cap

# ============================
# Model
# ============================
class FT(nn.Module):
    def __init__(self):
        super().__init__()
        self.bert = AutoModel.from_pretrained(MODEL)
        self.fc = nn.Linear(self.bert.config.hidden_size, 2)

    def forward(self, ids, mask):
        x = self.bert(ids, mask).last_hidden_state[:, 0]
        return self.fc(x)

# ============================
# Loaders / Savers
# ============================
def load_people():
    with open(PEOPLE_PATH, "r", encoding="utf-8") as f:
        return {p["name"]: p["entity_id"] for p in json.load(f)["people"]}

def load_events():
    if not os.path.exists(EVENTS_PATH):
        return []
    with open(EVENTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_events(events):
    with open(EVENTS_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)

# ============================
# Helpers
# ============================
def strength_from_prob(p):
    # same method as before (NO length-based nonsense)
    return min(MAX_ARTICLE_STRENGTH, abs(p - 0.5) * 2)

def event_id(item):
    return hashlib.sha1(
        f"{item['title']}|{item['url']}".encode()
    ).hexdigest()

# ============================
# Core preprocess logic
# ============================
def run_preprocess(verbose=True, save_json=True):
    """
    - Calls crawler as a module
    - Converts raw news → events
    - Returns list of NEW events (in-memory)
    """

    if verbose:
        print("[preprocess] start")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FT().to(device).eval()
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    softmax = nn.Softmax(dim=1)

    people = load_people()
    existing_events = load_events()
    existing_ids = {
    e["event_id"]
    for e in existing_events
    if "event_id" in e
    }


    new_events = []

    # 🔹 crawler as module
    raw_news = run_crawler(verbose=verbose, save_json=True)

    if verbose:
        print(f"[preprocess] processing {len(raw_news)} articles")

    for item in raw_news:
        eid = event_id(item)
        if eid in existing_ids:
            if verbose:
                print("[preprocess]   skip duplicate article")
            continue

        enc = tokenizer(
            item["title"],
            return_tensors="pt",
            truncation=True,
            max_length=32,
            padding=True,
        )
        enc = {k: v.to(device) for k, v in enc.items()}

        with torch.no_grad():
            prob = softmax(
                model(enc["input_ids"], enc["attention_mask"])
            )[0, 1].item()

        strength = strength_from_prob(prob)
        pid = people.get(item["person_name"])

        if not pid:
            if verbose:
                print("[preprocess]   unknown person, skipped")
            continue

        for aid in item["asset_ids"]:
            new_events.append({
                "event_id": eid,
                "person_id": pid,
                "asset_id": aid,
                "strength": round(strength, 6),
                "timestamp": item["published_at"],
            })

        if verbose:
            print(
                f"[preprocess]   event created | "
                f"person={pid} assets={len(item['asset_ids'])} strength={strength:.3f}"
            )

    all_events = existing_events + new_events

    if save_json:
        save_events(all_events)
        if verbose:
            print(f"[preprocess] events.json updated ({len(all_events)} total)")

    if verbose:
        print(f"[preprocess] done | new_events={len(new_events)}")

    return new_events

# ============================
# CLI entry
# ============================
if __name__ == "__main__":
    run_preprocess(verbose=True, save_json=True)
