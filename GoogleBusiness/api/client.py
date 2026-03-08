# Google Business Profile API — client wrapper
# Uses My Business API v4 (accounts, locations, localPosts, reviews).

from googleapiclient.discovery import build

from .auth import get_credentials

MYBUSINESS_DISCOVERY = "https://mybusiness.googleapis.com/$discovery/rest?version=v4"


def get_gbp_client(credentials=None):
    """
    Build the My Business API v4 service.
    Requires explicit discovery URL (mybusiness is not in the default discovery index).
    """
    creds = credentials or get_credentials()
    service = build(
        "mybusiness",
        "v4",
        credentials=creds,
        discoveryServiceUrl=MYBUSINESS_DISCOVERY,
        cache_discovery=False,
    )
    return service


def list_accounts(service=None):
    """List all GBP accounts the authenticated user can access."""
    service = service or get_gbp_client()
    return service.accounts().list().execute()


def list_locations(service, account_name: str):
    """
    List locations for an account.
    account_name format: 'accounts/123456789'
    """
    return service.accounts().locations().list(parent=account_name).execute()


def create_post(service, account_id: str, location_id: str, body: dict):
    """
    Create a local post for a location.
    account_id: numeric ID only (e.g. '123456789')
    location_id: numeric ID only (e.g. '987654321')
    body: LocalPost resource (languageCode, summary, topicType, callToAction, media, etc.)
    """
    parent = f"accounts/{account_id}/locations/{location_id}"
    return (
        service.accounts()
        .locations()
        .localPosts()
        .create(parent=parent, body=body)
        .execute()
    )


def list_posts(service, account_id: str, location_id: str):
    """List local posts for a location."""
    parent = f"accounts/{account_id}/locations/{location_id}"
    return (
        service.accounts()
        .locations()
        .localPosts()
        .list(parent=parent)
        .execute()
    )


def list_reviews(service, account_id: str, location_id: str, page_size: int = 50):
    """List reviews for a location."""
    parent = f"accounts/{account_id}/locations/{location_id}"
    return (
        service.accounts()
        .locations()
        .reviews()
        .list(parent=parent, pageSize=page_size)
        .execute()
    )
