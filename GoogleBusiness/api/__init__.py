# Google Business Profile API manager
# Use: from GoogleBusiness.api import get_gbp_client, list_accounts, list_locations, create_post, list_reviews
#      from GoogleBusiness.api.posts import build_post_from_template, WEEKLY_POST_TEMPLATES

from .auth import get_credentials
from .client import (
    get_gbp_client,
    list_accounts,
    list_locations,
    create_post,
    list_posts,
    list_reviews,
)
from . import posts

__all__ = [
    "get_credentials",
    "get_gbp_client",
    "list_accounts",
    "list_locations",
    "create_post",
    "list_posts",
    "list_reviews",
    "posts",
]
