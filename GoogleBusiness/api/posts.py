# Google Business Profile API — build LocalPost bodies from templates
# Matches the weekly post templates (STANDARD + callToAction; no event/offer unless needed).

def post_standard_cta(
    headline: str,
    summary: str,
    button_type: str = "LEARN_MORE",
    url: str | None = None,
    language_code: str = "en-US",
    media_source_url: str | None = None,
):
    """
    Build a STANDARD local post with a call-to-action button.
    button_type: LEARN_MORE (Get a quote / website), CALL (call business), BOOK, ORDER, SHOP, SIGN_UP
    For CALL, leave url unset.
    """
    body = {
        "languageCode": language_code,
        "summary": f"{headline}\n\n{summary}".strip(),
        "topicType": "STANDARD",
    }
    cta = {"actionType": button_type}
    if url and button_type != "CALL":
        cta["url"] = url
    body["callToAction"] = cta
    if media_source_url:
        body["media"] = [
            {"mediaFormat": "PHOTO", "sourceUrl": media_source_url}
        ]
    return body


# Predefined templates aligned with weekly-posts-templates.md
# Pass landing_page_url and optional image URL when creating.
WEEKLY_POST_TEMPLATES = [
    {
        "name": "Same-day service",
        "headline": "Same-day TV mounting in Boca Raton",
        "summary": "Need your TV mounted today? We offer same-day installation with concealed wiring and a clean, professional finish.",
        "button": "LEARN_MORE",
    },
    {
        "name": "Just completed",
        "headline": "Just completed — 65\" above the fireplace",
        "summary": "Concealed wiring and soundbar installed. Ready for game day.",
        "button": "CALL",
    },
    {
        "name": "Tip",
        "headline": "Why hide your TV wires?",
        "summary": "Concealed wiring looks cleaner, is safer for kids and pets, and protects cables. We run everything in-wall for a pro finish.",
        "button": "LEARN_MORE",
    },
    {
        "name": "Offer / seasonal",
        "headline": "TV mounting in Boca — professional & same-day",
        "summary": "Wall mount, above fireplace, or ceiling. Soundbar and wire concealment available. Serving Boca Raton and surrounding areas.",
        "button": "CALL",
    },
    {
        "name": "Social proof",
        "headline": "Thank you to our customers",
        "summary": "Your Google reviews help other homeowners in Boca find us. If we've mounted your TV, we'd love a quick review.",
        "button": "CALL",
    },
    {
        "name": "Reminder",
        "headline": "Same-day TV installation — Boca Raton",
        "summary": "Don't wait. We're fully equipped for wall mount, concealed wiring, and soundbar setup.",
        "button": "LEARN_MORE",
    },
]


def build_post_from_template(
    template_index: int,
    landing_page_url: str | None = None,
    media_url: str | None = None,
    language_code: str = "en-US",
) -> dict:
    """
    Build a LocalPost body from WEEKLY_POST_TEMPLATES by index (0–5).
    For LEARN_MORE buttons use landing_page_url; for CALL no URL needed.
    """
    t = WEEKLY_POST_TEMPLATES[template_index % len(WEEKLY_POST_TEMPLATES)]
    url = landing_page_url if t["button"] == "LEARN_MORE" else None
    return post_standard_cta(
        headline=t["headline"],
        summary=t["summary"],
        button_type=t["button"],
        url=url,
        language_code=language_code,
        media_source_url=media_url,
    )
