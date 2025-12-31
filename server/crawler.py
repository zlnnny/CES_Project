# crawler.py
import feedparser
import urllib.parse
import json
import os
import requests
import hashlib
from datetime import datetime
from newspaper import Article, Config

# ============================
# Paths & Constants
# ============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

ASSETS_PATH = os.path.join(DATA_DIR, "assets.json")
PEOPLE_PATH = os.path.join(DATA_DIR, "people.json")
SEEN_PATH   = os.path.join(DATA_DIR, "seen_articles.json")
RAW_NEWS_PATH = os.path.join(DATA_DIR, "raw_news.json")

TARGET_PER_PERSON = 5
MAX_RSS_SCAN = 50

# ============================
# Loaders
# ============================
def load_assets():
    with open(ASSETS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["assets"]

def load_people():
    with open(PEOPLE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["people"]

def load_seen():
    if not os.path.exists(SEEN_PATH):
        return set()
    with open(SEEN_PATH, "r") as f:
        return set(json.load(f))

def save_seen(seen):
    with open(SEEN_PATH, "w") as f:
        json.dump(sorted(seen), f, indent=2)

# ============================
# Helpers
# ============================
def article_hash(title, url):
    return hashlib.sha1(f"{title}|{url}".encode()).hexdigest()

def fetch_article(url):
    try:
        cfg = Config()
        cfg.browser_user_agent = "Mozilla/5.0"
        cfg.request_timeout = 4
        article = Article(url, config=cfg)
        article.download()
        article.parse()
        return article.text[:3000]
    except Exception:
        return ""

def extract_assets(text, assets):
    text = text.lower()
    hits = []
    for a in assets:
        name = a["name"].lower()
        if name in text:
            hits.append(a["asset_id"])
    return list(set(hits))

# ============================
# Core crawl logic
# ============================
def crawl_person(person, assets, seen, verbose=True):
    name = person["name"]
    results = []

    if verbose:
        print(f"[crawler] ▶ crawling person: {name}")

    for asset in assets:
        if len(results) >= TARGET_PER_PERSON:
            break

        query = f"{name} {asset['name']}"
        url = (
            "https://news.google.com/rss/search?"
            f"q={urllib.parse.quote(query)}&hl=en-US&gl=US&ceid=US:en"
        )

        try:
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
            feed = feedparser.parse(resp.content)
        except Exception as e:
            if verbose:
                print(f"[crawler]   ! RSS fetch failed: {e}")
            continue

        for entry in feed.entries[:MAX_RSS_SCAN]:
            if len(results) >= TARGET_PER_PERSON:
                break

            h = article_hash(entry.title, entry.link)
            if h in seen:
                continue

            text = fetch_article(entry.link)
            matched_assets = extract_assets(entry.title + " " + text, assets)

            if not matched_assets:
                continue

            seen.add(h)
            results.append({
                "person_name": name,
                "title": entry.title,
                "url": entry.link,
                "published_at": datetime.utcnow().isoformat(),
                "asset_ids": matched_assets,
                "raw_text": text,
            })

            if verbose:
                print(
                    f"[crawler]     + article accepted | assets={matched_assets}"
                )

    if verbose:
        print(f"[crawler] ◀ done {name} ({len(results)} articles)")
    return results

# ============================
# Public API (imported by score.py)
# ============================
def run_crawler(verbose=True, save_json=True):
    """
    Main crawler entry.
    - Returns raw_news list (for in-memory use)
    - Optionally saves raw_news.json (for inspection)
    """
    assets = load_assets()
    people = load_people()
    seen = load_seen()

    all_news = []

    if verbose:
        print(f"[crawler] start | people={len(people)}")

    people = people[:3]  # DEBUG: limit to first 3 people , for faster testing
    for p in people:
        person_news = crawl_person(p, assets, seen, verbose=verbose)
        all_news.extend(person_news)

    save_seen(seen)

    if save_json:
        with open(RAW_NEWS_PATH, "w", encoding="utf-8") as f:
            json.dump(all_news, f, indent=2, ensure_ascii=False)
        if verbose:
            print(f"[crawler] raw_news.json saved ({len(all_news)} articles)")

    if verbose:
        print(f"[crawler] finished | total={len(all_news)}")

    return all_news

# ============================
# CLI entry
# ============================
if __name__ == "__main__":
    data = run_crawler(verbose=True, save_json=True)
    print(f"[crawler] collected {len(data)} valid articles")
