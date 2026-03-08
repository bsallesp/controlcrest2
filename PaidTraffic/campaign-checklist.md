# Google Ads campaign — setup checklist

Before launching, ensure GBP and landing page are live. Then create a **Search** campaign with the settings below.

---

## Campaign settings

| Setting | Value |
|---------|--------|
| Campaign type | Search |
| Goal | Leads |
| Location | 50-mile radius, center ZIP **33433** (Boca Raton) |
| Location options | Presence or interest in location |
| Ad schedule | 8:00 AM – 8:00 PM (or your real hours) |
| Start budget | **$40/day** |

---

## Targeting

- [ ] **Keywords** added from `keywords.csv` (Phrase match). Create ad groups: **Primary** and **Premium**.
- [ ] **Negative keywords** added at campaign level from `negative-keywords.txt`.
- [ ] (Optional) Add location bid adjustments for priority cities (Parkland, Weston, Delray Beach) if needed later.

---

## Bidding

- [ ] **Initial:** Maximize Clicks (to get volume and data).
- [ ] **After ~20–30 conversions:** Switch to Maximize Conversions or tCPA if you have a cost-per-lead target.

---

## Ads & extensions

- [ ] At least 2 responsive search ads created (use `ad-copy.md`).
- [ ] **Call extension:** your business phone.
- [ ] **Location extension:** linked to GBP.
- [ ] **Sitelink extensions:** e.g. “Get a quote”, “Same-day service”, “Services”.

---

## Conversion tracking (recommended)

- [ ] Track form submissions and/or calls (e.g. Google Ads call tracking or form thank-you page).
- [ ] Set “Lead” or “Contact” as conversion action so you can optimize for conversions later.

---

## After launch

- [ ] Check search terms report weekly; add irrelevant terms as negatives.
- [ ] When CPA and close rate are stable, consider scaling budget to $80–$150/day.
- [ ] Use the call script in `../PaidTraffic/README.md` (qualification questions) when leads call.
