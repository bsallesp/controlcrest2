#!/usr/bin/env python3
"""
Example: list accounts/locations, then create one weekly post (template 0).
Set LANDING_PAGE_URL in env or pass as first arg. Requires client_secrets.json and API access.

Run from project root:
  python -m GoogleBusiness.api.run_example https://seusite.com
"""
import os
import sys

# Allow running as script from api/ (project root = parent of GoogleBusiness)
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)

from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations, create_post
from GoogleBusiness.api.posts import build_post_from_template


def main():
    landing_url = os.environ.get("LANDING_PAGE_URL") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not landing_url:
        print("Set LANDING_PAGE_URL or pass URL as first argument.")
        sys.exit(1)

    service = get_gbp_client()
    accounts = list_accounts(service)
    account_list = accounts.get("accounts") or []
    if not account_list:
        print("No accounts found. Check API access and OAuth scope.")
        sys.exit(1)

    account = account_list[0]
    account_name = account["name"]
    account_id = account_name.split("/")[-1]
    print(f"Account: {account.get('accountName', account_name)}")

    locs = list_locations(service, account_name)
    location_list = locs.get("locations") or []
    if not location_list:
        print("No locations found for this account.")
        sys.exit(1)

    loc = location_list[0]
    location_id = loc["name"].split("/")[-1]
    print(f"Location: {loc.get('title', loc['name'])}")

    body = build_post_from_template(0, landing_page_url=landing_url, language_code="en-US")
    result = create_post(service, account_id, location_id, body)
    print("Post created:", result.get("name", result))
    if result.get("searchUrl"):
        print("Share URL:", result["searchUrl"])


if __name__ == "__main__":
    main()
