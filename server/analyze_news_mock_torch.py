import argparse
import json
import os
import random
import re
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import List, Optional

import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset

try:
    from transformers import AutoModel, AutoTokenizer, get_linear_schedule_with_warmup
    from torch.optim import AdamW
except ImportError as exc:  # pragma: no cover - runtime dependency guard
    raise SystemExit(
        "Missing dependencies. Install with: pip install torch transformers"
    ) from exc

DEFAULT_INPUT = "trump_news_data.json"
DEFAULT_OUTPUT = "trump_news_analyzed_torch.json"
DEFAULT_RELATIONSHIP_DATASET = "leader_asset_dataset.json"

POSITIVE_WORDS = {
    "gain", "rise", "surge", "record", "growth", "beat", "strong", "profit", "rally",
    "upgrade", "optimistic", "boost", "win", "expand"
}
NEGATIVE_WORDS = {
    "drop", "fall", "slump", "decline", "loss", "weak", "recession", "risk", "lawsuit",
    "downgrade", "cut", "miss", "crash", "fraud"
}

ASSET_KEYWORDS = {
    "Tesla": ["tesla", "tsla", "ev", "electric vehicle"],
    "SpaceX": ["spacex", "starship", "falcon", "space launch"],
    "S&P 500": ["s&p 500", "sp500", "s&p", "equities", "stock market"],
    "NASDAQ": ["nasdaq", "tech stocks"],
    "USD Index": ["usd", "dollar", "greenback", "dxy"],
    "Gold": ["gold", "bullion", "precious metal"],
    "Bitcoin": ["bitcoin", "btc", "crypto"],
    "10Y Treasury": ["10y", "treasury", "yield", "bond"],
    "Oil": ["oil", "crude", "brent", "wti"],
}

LEADER_PROFILES = {
    "elon musk": {
        "entity_id": "pers_elon_musk",
        "name": "Elon Musk",
        "aliases": ["musk"],
        "descriptors": ["CEO of Tesla", "CEO of SpaceX"],
    },
    "donald trump": {
        "entity_id": "pers_donald_trump",
        "name": "Donald Trump",
        "aliases": ["trump"],
        "descriptors": ["Former US President"],
    },
}

DEFAULT_DATASET = {
    "entities": [],
    "asset_keywords": {},
    "meta": {"version": 1, "updated_at": None},
}


def normalize_text(text: str) -> str:
    return " ".join(text.lower().strip().split())


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")


def load_relationship_dataset(path: str) -> dict:
    if not os.path.exists(path):
        return json.loads(json.dumps(DEFAULT_DATASET))
    with open(path, "r", encoding="utf-8") as f:
        dataset = json.load(f)
    if "entities" not in dataset:
        dataset["entities"] = []
    if "asset_keywords" not in dataset:
        dataset["asset_keywords"] = {}
    if "meta" not in dataset:
        dataset["meta"] = {"version": 1, "updated_at": None}
    return dataset


def save_relationship_dataset(path: str, dataset: dict) -> None:
    dataset["meta"]["updated_at"] = datetime.now(timezone.utc).isoformat()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4, ensure_ascii=False)


def find_entity(dataset: dict, leader_name: str) -> Optional[dict]:
    normalized = normalize_text(leader_name)
    for entity in dataset["entities"]:
        if normalize_text(entity["name"]) == normalized:
            return entity
        for alias in entity.get("aliases", []):
            if normalize_text(alias) == normalized:
                return entity
    return None


def ensure_entity(dataset: dict, leader_name: str) -> dict:
    entity = find_entity(dataset, leader_name)
    if entity:
        normalized = normalize_text(leader_name)
        alias_norms = {normalize_text(alias) for alias in entity.get("aliases", [])}
        if normalized not in {normalize_text(entity["name"])} | alias_norms:
            entity.setdefault("aliases", []).append(leader_name)
        return entity
    profile = LEADER_PROFILES.get(normalize_text(leader_name))
    if profile:
        entity = {
            "entity_id": profile["entity_id"],
            "name": profile["name"],
            "aliases": profile["aliases"],
            "descriptors": profile["descriptors"],
            "assets": {},
        }
    else:
        alias_candidates = []
        parts = leader_name.strip().split()
        if len(parts) > 1:
            alias_candidates.append(parts[-1])
        entity = {
            "entity_id": f"pers_{slugify(leader_name)}",
            "name": leader_name,
            "aliases": alias_candidates,
            "descriptors": [],
            "assets": {},
        }
    dataset["entities"].append(entity)
    return entity


def infer_assets(text: str):
    return infer_assets_from_keywords(text, ASSET_KEYWORDS, {})


def build_asset_keywords(dynamic_keywords: dict) -> dict:
    merged = {}
    for asset, keywords in ASSET_KEYWORDS.items():
        merged[asset] = set(keywords)
    for asset, keywords in dynamic_keywords.items():
        merged.setdefault(asset, set()).update(keywords)
    return {asset: sorted(values) for asset, values in merged.items()}


def detect_ticker_assets(text: str) -> List[str]:
    tickers = set(re.findall(r"\\$([A-Z]{1,5})\\b", text))
    tickers.update(re.findall(r"\\(([A-Z]{1,5})\\)", text))
    return sorted(tickers)


def infer_assets_from_keywords(
    text: str,
    asset_keywords: dict,
    dynamic_keywords: dict,
):
    normalized = normalize_text(text)
    matched = []
    asset_hits = {}
    for asset, keywords in asset_keywords.items():
        hits = [kw for kw in keywords if kw in normalized]
        if hits:
            matched.append(asset)
            asset_hits[asset] = hits
    if not matched:
        tickers = detect_ticker_assets(text)
        for ticker in tickers:
            keyword = ticker.lower()
            matched.append(ticker)
            asset_hits[ticker] = [keyword]
            dynamic_keywords.setdefault(ticker, [])
            if keyword not in dynamic_keywords[ticker]:
                dynamic_keywords[ticker].append(keyword)
            asset_keywords.setdefault(ticker, [])
            if keyword not in asset_keywords[ticker]:
                asset_keywords[ticker].append(keyword)
    return matched, asset_hits


def update_entity_assets(entity: dict, assets: List[str], asset_hits: dict) -> None:
    for asset in assets:
        if asset not in entity["assets"]:
            entity["assets"][asset] = {"score": 1, "keywords": asset_hits.get(asset, [])}
        else:
            entity["assets"][asset]["score"] += 1
            for keyword in asset_hits.get(asset, []):
                if keyword not in entity["assets"][asset]["keywords"]:
                    entity["assets"][asset]["keywords"].append(keyword)


def build_relationship_edges(entity: dict, assets: List[str]) -> List[dict]:
    edges = []
    for asset in assets:
        info = entity.get("assets", {}).get(asset, {})
        edges.append(
            {
                "leader": entity["name"],
                "asset": asset,
                "score": info.get("score", 0),
                "keywords": info.get("keywords", []),
            }
        )
    return edges


def weak_label(text: str) -> Optional[int]:
    normalized = normalize_text(text)
    pos = sum(1 for word in POSITIVE_WORDS if word in normalized)
    neg = sum(1 for word in NEGATIVE_WORDS if word in normalized)
    if pos == neg:
        return None
    return 1 if pos > neg else 0


@dataclass
class NewsExample:
    title: str
    label: Optional[int]
    meta: dict


class NewsDataset(Dataset):
    def __init__(self, examples: List[NewsExample]):
        self.examples = examples

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        return self.examples[idx]


class FT_CE_RNN(nn.Module):
    def __init__(
        self,
        model_name: str,
        hidden_size: int = 256,
        num_layers: int = 2,
        dropout: float = 0.5,
        freeze_bert: bool = False,
    ):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        bert_hidden = self.bert.config.hidden_size
        self.rnn = nn.LSTM(
            input_size=bert_hidden,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,
        )
        self.classifier = nn.Linear(hidden_size, 2)

        if freeze_bert:
            for param in self.bert.parameters():
                param.requires_grad = False

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        token_embeddings = outputs.last_hidden_state
        rnn_out, _ = self.rnn(token_embeddings)
        lengths = attention_mask.sum(dim=1).clamp(min=1)
        last_indices = (lengths - 1).unsqueeze(1).unsqueeze(2)
        last_indices = last_indices.expand(-1, 1, rnn_out.size(2))
        last_hidden = rnn_out.gather(1, last_indices).squeeze(1)
        logits = self.classifier(last_hidden)
        return logits


def build_examples(raw_items, use_weak_labels: bool) -> List[NewsExample]:
    examples = []
    for item in raw_items:
        title = item.get("title", "")
        label = item.get("label")
        if label is None and "score" in item:
            label = 1 if item["score"] > 0 else 0
        if label is None and use_weak_labels:
            label = weak_label(title)
        examples.append(NewsExample(title=title, label=label, meta=item))
    return examples


def collate_batch(batch, tokenizer, max_length):
    titles = [ex.title for ex in batch]
    encoding = tokenizer(
        titles,
        padding=True,
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )
    labels = [ex.label for ex in batch]
    has_labels = all(label is not None for label in labels)
    if has_labels:
        encoding["labels"] = torch.tensor(labels, dtype=torch.long)
    return encoding, batch


def train_model(model, dataloader, optimizer, scheduler, device):
    model.train()
    total_loss = 0.0
    loss_fn = nn.CrossEntropyLoss()
    for batch, _ in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["labels"].to(device)
        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)
        loss = loss_fn(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
        total_loss += loss.item()
    return total_loss / max(1, len(dataloader))


def evaluate_model(model, dataloader, device):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for batch, _ in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            logits = model(input_ids, attention_mask)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
    return correct / total if total else 0.0


def inference(model, dataloader, device, relationship_dataset):
    model.eval()
    results = []
    softmax = nn.Softmax(dim=1)
    dynamic_keywords = relationship_dataset.get("asset_keywords", {})
    asset_keywords = build_asset_keywords(dynamic_keywords)
    with torch.no_grad():
        for batch, examples in dataloader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            logits = model(input_ids, attention_mask)
            probs = softmax(logits).cpu().tolist()
            for prob, example in zip(probs, examples):
                score = (prob[1] - 0.5) * 2
                label = "Positive" if prob[1] >= 0.5 else "Negative"
                leader = example.meta.get("leader", "Unknown")
                assets, asset_hits = infer_assets_from_keywords(
                    example.title, asset_keywords, dynamic_keywords
                )
                entity = ensure_entity(relationship_dataset, leader)
                if assets:
                    update_entity_assets(entity, assets, asset_hits)
                relationships = build_relationship_edges(entity, assets)
                results.append(
                    {
                        **example.meta,
                        "analysis": {
                            "model": "FT-CE-RNN (torch)",
                            "label": label,
                            "prob_positive": round(prob[1], 4),
                            "score": round(score, 4),
                            "impact_assets": assets,
                            "leader_asset_relationships": relationships,
                        },
                    }
                )
    return results


def split_examples(examples, train_split, seed):
    labeled = [ex for ex in examples if ex.label is not None]
    unlabeled = [ex for ex in examples if ex.label is None]
    rng = random.Random(seed)
    rng.shuffle(labeled)
    split_idx = int(len(labeled) * train_split)
    train = labeled[:split_idx]
    valid = labeled[split_idx:] if split_idx < len(labeled) else []
    return train, valid, unlabeled


def main():
    parser = argparse.ArgumentParser(description="FT-CE-RNN pipeline using BERT + LSTM")
    parser.add_argument("--input", default=DEFAULT_INPUT, help="Input JSON file")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output JSON file")
    parser.add_argument("--model-name", default="bert-base-uncased", help="HuggingFace model name")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=32)
    parser.add_argument("--hidden-size", type=int, default=256)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.5)
    parser.add_argument("--lr", type=float, default=5e-6)
    parser.add_argument("--train-split", type=float, default=0.8)
    parser.add_argument("--freeze-bert", action="store_true")
    parser.add_argument("--weak-labels", action="store_true", help="Use lexicon-based labels if none exist")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--relationship-dataset",
        default=DEFAULT_RELATIONSHIP_DATASET,
        help="JSON file storing leader-asset relationships",
    )
    args = parser.parse_args()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(current_dir, args.input)
    output_path = os.path.join(current_dir, args.output)
    relationship_path = os.path.join(current_dir, args.relationship_dataset)

    with open(input_path, "r", encoding="utf-8") as f:
        raw_items = json.load(f)

    examples = build_examples(raw_items, use_weak_labels=args.weak_labels)
    labeled_count = sum(1 for ex in examples if ex.label is not None)
    if labeled_count == 0:
        raise SystemExit(
            "No labels found. Add 'label' or 'score' to inputs, or use --weak-labels."
        )

    train_examples, valid_examples, _ = split_examples(
        examples, args.train_split, args.seed
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = FT_CE_RNN(
        model_name=args.model_name,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        dropout=args.dropout,
        freeze_bert=args.freeze_bert,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    train_loader = DataLoader(
        NewsDataset(train_examples),
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=lambda batch: collate_batch(batch, tokenizer, args.max_length),
    )
    valid_loader = DataLoader(
        NewsDataset(valid_examples),
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=lambda batch: collate_batch(batch, tokenizer, args.max_length),
    )

    optimizer = AdamW(model.parameters(), lr=args.lr)
    total_steps = max(1, len(train_loader) * args.epochs)
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=max(1, total_steps // 10), num_training_steps=total_steps
    )

    for epoch in range(1, args.epochs + 1):
        loss = train_model(model, train_loader, optimizer, scheduler, device)
        if valid_examples:
            accuracy = evaluate_model(model, valid_loader, device)
            print(f"Epoch {epoch}: loss={loss:.4f}, val_acc={accuracy:.3f}")
        else:
            print(f"Epoch {epoch}: loss={loss:.4f}")

    inference_loader = DataLoader(
        NewsDataset(examples),
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=lambda batch: collate_batch(batch, tokenizer, args.max_length),
    )
    relationship_dataset = load_relationship_dataset(relationship_path)
    results = inference(model, inference_loader, device, relationship_dataset)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4, ensure_ascii=False)

    save_relationship_dataset(relationship_path, relationship_dataset)

    print(f"Saved analyzed data to {output_path}")
    print(f"Updated relationship dataset at {relationship_path}")


if __name__ == "__main__":
    main()

