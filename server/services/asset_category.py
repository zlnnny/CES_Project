from __future__ import annotations

import re


_SPACE_RE = re.compile(r"\s+")


def _norm(s: str | None) -> str:
    if not s:
        return ""
    return _SPACE_RE.sub(" ", s).strip().lower()


# Manual high-precision overrides (ticker/name -> category)
# MUST use only the 9 standardized categories:
# Consumer, Defense, Financial, Healthcare, Index, Industrials & Energy, Semiconductor, Technology, Other
_TICKER_OVERRIDES: dict[str, str] = {
    # Semiconductors
    "mu": "Semiconductor", "nvda": "Semiconductor", "amd": "Semiconductor", "qcom": "Semiconductor",
    "avgo": "Semiconductor", "intc": "Semiconductor", "amat": "Semiconductor", "lrcx": "Semiconductor",
    "klac": "Semiconductor", "snps": "Semiconductor", "cdns": "Semiconductor", "on": "Semiconductor",
    "nxpi": "Semiconductor", "mchp": "Semiconductor", "mpwr": "Semiconductor", "ter": "Semiconductor",
    "swks": "Semiconductor", "qrvo": "Semiconductor",
    # Technology (Big Tech / SaaS / Security / Platform)
    "aapl": "Technology", "msft": "Technology", "goog": "Technology", "googl": "Technology",
    "meta": "Technology", "panw": "Technology", "crwd": "Technology", "ftnt": "Technology",
    "adbe": "Technology", "crm": "Technology", "now": "Technology", "work": "Technology",
    "ddog": "Technology", "zs": "Technology", "okta": "Technology", "mndy": "Technology",
    "asml": "Semiconductor", "tsm": "Semiconductor",
    # Financial
    "jpm": "Financial", "v": "Financial", "ma": "Financial", "pypl": "Financial", "sq": "Financial",
    "gs": "Financial", "ms": "Financial", "brk-b": "Financial", "axp": "Financial",
    # Index
    "spy": "Index", "qqq": "Index", "dia": "Index", "iwm": "Index", "vti": "Index",
    # Healthcare
    "lly": "Healthcare", "jnj": "Healthcare", "unh": "Healthcare", "pfe": "Healthcare",
    "mrk": "Healthcare", "abbv": "Healthcare", "tmo": "Healthcare", "isrg": "Healthcare",
    # Defense
    "lmt": "Defense", "rtx": "Defense", "noc": "Defense", "gd": "Defense", "ba": "Defense",
    # Industrials & Energy
    "xom": "Industrials & Energy", "cvx": "Industrials & Energy", "cat": "Industrials & Energy",
    "de": "Industrials & Energy", "hon": "Industrials & Energy", "ups": "Industrials & Energy",
    "ge": "Industrials & Energy", "tsla": "Industrials & Energy",
}

_NAME_OVERRIDES: dict[str, str] = {
    "apple": "Technology", "microsoft": "Technology", "alphabet": "Technology", "meta": "Technology",
    "nvidia": "Semiconductor", "tesla": "Industrials & Energy", "amazon": "Consumer",
    "netflix": "Consumer", "disney": "Consumer", "visa": "Financial", "mastercard": "Financial",
    "jpmorgan": "Financial", "goldman sachs": "Financial", "morgan stanley": "Financial",
    "lockheed martin": "Defense", "raytheon": "Defense", "boeing": "Defense", "northrop grumman": "Defense",
    "exxon mobil": "Industrials & Energy", "chevron": "Industrials & Energy",
    "johnson & johnson": "Healthcare", "pfizer": "Healthcare", "merck": "Healthcare",
}


def infer_asset_category(
    *,
    name: str | None,
    symbol: str | None,
    key_issues: str | None,
    sector: str | None = None,
    asset_type: str | None = None,
) -> str | None:
    """
    Infer industry category for an asset. 
    Returns one of: Consumer, Defense, Financial, Healthcare, Index, Industrials & Energy, Semiconductor, Technology, Other
    """
    sym = _norm(symbol)
    nm = _norm(name)
    sec = _norm(sector)
    at = _norm(asset_type)

    if sym in _TICKER_OVERRIDES:
        return _TICKER_OVERRIDES[sym]
    for k, v in _NAME_OVERRIDES.items():
        if k in nm:
            return v

    text = " ".join([nm, sym, _norm(key_issues), sec, at]).strip()
    if not text:
        return "Other"

    # 1. Semiconductor (반도체)
    if any(k in text for k in ["semiconductor", "chip", "gpu", "hbm", "wafer", "lithography", "foundry", "eda"]):
        return "Semiconductor"

    # 2. Technology (빅테크/SaaS/보안/플랫폼)
    if any(k in text for k in ["software", "saas", "cloud", "platform", "security", "cyber", "ai", "artificial intelligence", "network", "telecom", "5g"]):
        return "Technology"

    # 3. Financial (금융/결제)
    if any(k in text for k in ["bank", "financial", "payment", "insurance", "credit card", "brokerage", "investment"]):
        return "Financial"

    # 4. Healthcare (헬스케어/바이오)
    if any(k in text for k in ["healthcare", "biotech", "pharma", "medical", "drug", "clinical", "biology"]):
        return "Healthcare"

    # 5. Defense (방산)
    if any(k in text for k in ["defense", "weapon", "missile", "military", "nato", "aerospace defense", "lockheed", "raytheon"]):
        return "Defense"

    # 6. Industrials & Energy (산업재/에너지)
    if any(k in text for k in ["industrial", "energy", "oil", "gas", "utility", "ev", "electric vehicle", "automotive", "logistics", "shipping", "aerospace"]):
        return "Industrials & Energy"

    # 7. Consumer (소비재/서비스)
    if any(k in text for k in ["consumer", "retail", "travel", "hotel", "streaming", "entertainment", "restaurant", "food", "beverage"]):
        return "Consumer"

    # 8. Index (지수)
    if any(k in text for k in ["index", "etf", "s&p", "nasdaq", "dow j", "market index"]):
        return "Index"

    # 9. Other (기타)
    return "Other"


