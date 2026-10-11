#!/usr/bin/env python3
"""
Rise Up Roofing & Construction — Manual Review Importer CLI

Usage:
  python scripts/import_review.py --name "Steve P." --rating 5 --city "San Diego" --service "Roof Replacement" --text "Fantastic work!"
  python scripts/import_review.py --interactive
"""

import sys
import argparse
import json
import os
import requests

CRON_SECRET = os.environ.get("CRON_SECRET", "ec696bcd74f17face3f6afeca90223d0e0b39b5126eaf5c5d697c84ab50d670b")
DEFAULT_URL = "http://127.0.0.1:8010" if os.path.exists("/opt/riseup-prod") else "https://backend.riseuprac.com"
BACKEND_URL = os.environ.get("BACKEND_URL", DEFAULT_URL)

def main():
    parser = argparse.ArgumentParser(description="Import an authentic review to Rise Up Roofing DB")
    parser.add_argument("--name", type=str, help="Customer full name or initial")
    parser.add_argument("--rating", type=int, default=5, choices=[1, 2, 3, 4, 5], help="Star rating (1-5)")
    parser.add_argument("--city", type=str, default="Oceanside", help="City (e.g. Oceanside, Carlsbad, San Diego)")
    parser.add_argument("--service", type=str, default="Roofing & Construction", help="Service type")
    parser.add_argument("--text", type=str, help="Customer review comment/feedback")
    parser.add_argument("--reply", type=str, default=None, help="Owner response text (optional)")
    parser.add_argument("--date", type=str, default=None, help="Original date/timestamp (ISO format, optional)")
    parser.add_argument("--source", type=str, default="google", choices=["google", "yelp", "direct"], help="Review platform")
    parser.add_argument("--interactive", action="store_true", help="Prompt interactively for fields")

    args = parser.parse_args()

    if args.interactive:
        print("=== Rise Up Roofing - Manual Review Importer ===")
        name = input("Customer Name: ").strip()
        rating = int(input("Rating (1-5) [5]: ") or 5)
        city = input("City [Oceanside]: ").strip() or "Oceanside"
        service = input("Service Type [Roofing & Construction]: ").strip() or "Roofing & Construction"
        text = input("Review Text: ").strip()
        reply = input("Owner Reply (optional, press Enter to skip): ").strip() or None
        source = input("Source (google/yelp/direct) [google]: ").strip() or "google"
    else:
        if not args.name or not args.text:
            print("Error: --name and --text are required when not using --interactive.")
            parser.print_help()
            sys.exit(1)
        name = args.name
        rating = args.rating
        city = args.city
        service = args.service
        text = args.text
        reply = args.reply
        source = args.source

    payload = {
        "customer_name": name,
        "rating": rating,
        "feedback": text,
        "customer_city": city,
        "service_type": service,
        "source": source,
        "owner_reply": reply,
        "original_time": args.date,
    }

    print(f"\nSubmitting review for '{name}' to {BACKEND_URL}/api/reviews/manual-import ...")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/reviews/manual-import",
            json=payload,
            headers={
                "Authorization": f"Bearer {CRON_SECRET}",
                "Content-Type": "application/json"
            },
            timeout=15.0
        )
        if resp.status_code == 200:
            res_data = resp.json()
            print("[SUCCESS] Review published immediately to live website.")
            print(f"Review ID: {res_data.get('reviewId')}")
            stats = res_data.get('updatedStats', {})
            print(f"Updated Total Reviews: {stats.get('totalCount')}")
            print(f"Updated Dynamic Average Rating: {stats.get('averageRating')} / 5.0")
        else:
            print(f"[FAILED] ({resp.status_code}): {resp.text}")
    except Exception as e:
        print(f"[ERROR] Connection error: {e}")

if __name__ == "__main__":
    main()
