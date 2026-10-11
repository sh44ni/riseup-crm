#!/usr/bin/env python3
"""
Rise Up Roofing & Construction — Hourly Safe Review Poller

Runs once per hour (via cron or scheduler) without exhausting API limits:
1. Calls backend review sync endpoint which checks Places API / GMB only if remote rating count increased.
2. Retrieves and logs the dynamic rating and published review count.
3. Exits in milliseconds if count is unchanged.

Usage:
  python scripts/hourly_review_sync.py
"""

import sys
import json
from datetime import datetime, timezone
import requests

BACKEND_URL = "https://backend.riseuprac.com"
CRON_SECRET = "ec696bcd74f17face3f6afeca90223d0e0b39b5126eaf5c5d697c84ab50d670b"

def run_hourly_sync():
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[{now_str}] Starting hourly review synchronization check...")

    headers = {
        "Authorization": f"Bearer {CRON_SECRET}",
        "Accept": "application/json"
    }

    # 1. Trigger the safe cron sync endpoint
    try:
        sync_resp = requests.get(
            f"{BACKEND_URL}/api/cron/sync-reviews",
            headers=headers,
            timeout=20.0
        )
        if sync_resp.status_code == 200:
            sync_data = sync_resp.json()
            google_status = sync_data.get("google", {}).get("message", "Checked")
            yelp_status = sync_data.get("yelp", {}).get("message", "Checked")
            print(f"[{now_str}] Sync result:")
            print(f"  - Google: {google_status}")
            print(f"  - Yelp:   {yelp_status}")
        else:
            print(f"[{now_str}] Warning: Sync endpoint returned HTTP {sync_resp.status_code}: {sync_resp.text}")
    except Exception as e:
        print(f"[{now_str}] Sync trigger error: {e}")

    # 2. Check current public stats
    try:
        stats_resp = requests.get(f"{BACKEND_URL}/api/reviews/public", timeout=10.0)
        if stats_resp.status_code == 200:
            data = stats_resp.json()
            stats = data.get("stats", {})
            print(f"[{now_str}] Live Website Status:")
            print(f"  - Total Published Reviews: {stats.get('totalCount')}")
            print(f"  - Dynamic Average Rating:  {stats.get('averageRating')} / 5.0")
            print(f"  - Google Rating / Count:   {stats.get('googleRating')} ★ ({stats.get('googleCount')} reviews)")
            print(f"  - Yelp Rating / Count:     {stats.get('yelpRating')} ★ ({stats.get('yelpCount')} reviews)")
        else:
            print(f"[{now_str}] Error reading public endpoint: {stats_resp.status_code}")
    except Exception as e:
        print(f"[{now_str}] Error checking public endpoint: {e}")

    print(f"[{now_str}] Hourly check complete. API limits preserved.\n")

if __name__ == "__main__":
    run_hourly_sync()
