# Google Business Profile API — OAuth2 authentication
# Run once to open browser and save token; then token is reused.

import os
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# Scopes needed for GBP: manage profile, locations, posts, reviews
SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "https://www.googleapis.com/auth/plus.business.manage",
]

# Paths relative to this file
_API_DIR = Path(__file__).resolve().parent
DEFAULT_CREDENTIALS_FILE = _API_DIR / "client_secrets.json"
DEFAULT_TOKEN_FILE = _API_DIR / "token.json"


def get_credentials(
    credentials_file: str | Path | None = None,
    token_file: str | Path | None = None,
) -> Credentials:
    """
    Load or refresh OAuth2 credentials.
    First run: open browser for consent and save token to token_file.
    """
    credentials_file = Path(credentials_file or DEFAULT_CREDENTIALS_FILE)
    token_file = Path(token_file or DEFAULT_TOKEN_FILE)

    creds = None
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not credentials_file.exists():
                raise FileNotFoundError(
                    f"Credentials file not found: {credentials_file}\n"
                    "Download OAuth 2.0 client secrets (Desktop app) from Google Cloud Console\n"
                    "and save as 'client_secrets.json' in GoogleBusiness/api/"
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(credentials_file), SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(token_file, "w") as f:
            f.write(creds.to_json())
    return creds
