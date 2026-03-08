#!/usr/bin/env python3
"""
Test auth and list GBP accounts + locations (no post). Requires client_secrets.json and API access.
Run from project root: python -m GoogleBusiness.api.list_accounts_locations
"""
import os
import sys

_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)

from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations


def main():
    service = get_gbp_client()
    accounts = list_accounts(service)
    account_list = accounts.get("accounts") or []
    if not account_list:
        print("No accounts found. Check API access and OAuth scope.")
        sys.exit(1)
    for acc in account_list:
        name = acc.get("accountName") or acc["name"]
        print(f"Account: {name}")
        locs = list_locations(service, acc["name"])
        for loc in locs.get("locations") or []:
            print(f"  Location: {loc.get('title', loc['name'])} ({loc['name']})")
        print()


if __name__ == "__main__":
    main()
