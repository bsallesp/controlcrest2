# Landing Page — Setup

1. **Phone number:** In [CONFIG.md](../CONFIG.md) set **YOUR_PHONE** (ex: `+15615551234`). Use Find & Replace em `index.html`: `YOUR_PHONE` → seu número.
2. **Gallery:** Replace the four `.gallery-item` divs with `<img src="your-photo.jpg" alt="Description">` using real job photos.
3. **Form:** Point the form `action` to your endpoint (e.g. Formspree, Google Form, or your backend). Example for Formspree: `action="https://formspree.io/f/YOUR_ID" method="POST"`.
4. **Optional:** Host on Netlify, Vercel, or any static host. Use your domain for GBP and Google Ads.
