# PlausibleBA — SEO Strategy & Tracking

*Last updated: 17 March 2026*

---

## Current state

**Domain:** www.plausibleba.com  
**Hosting:** GitHub Pages (static HTML — fast, crawlable)  
**Analytics:** Plausible Analytics (privacy-first, no cookies)  
**Search Console:** Not yet registered ← **do this first**

### Technical SEO — completed
- [x] Custom domain with www redirect
- [x] Meta titles on all pages (keyword-optimised 17 Mar)
- [x] Meta descriptions on all pages (keyword-optimised 17 Mar)
- [x] sitemap.xml at /sitemap.xml
- [x] robots.txt at /robots.txt
- [x] Plausible Analytics on all pages
- [x] Favicon on all pages
- [x] Clean URL structure (/skills, /install, /case-study etc)
- [x] JSON-LD structured data on index, install, case-study
- [ ] Google Search Console registration
- [ ] Bing Webmaster Tools registration
- [ ] Open Graph tags (for social sharing previews)
- [ ] Twitter/X card meta tags
- [ ] Canonical URL tags on all pages
- [ ] Page speed audit (Lighthouse)

---

## Keyword strategy

### Primary keywords (high intent, BA audience)

| Keyword | Monthly volume (est) | Competition | Target page | Status |
|---------|---------------------|-------------|-------------|--------|
| business capability map template | 500–1k | Medium | /skills | In progress |
| value stream mapping tool free | 200–500 | Medium | /skills | In progress |
| BABOK capability map | 100–200 | Low | /methodology | In progress |
| business architecture tool | 1k–5k | High | / | Long term |
| capability map generator | 200–500 | Low | / | In progress |
| business concept model | 100–200 | Low | /methodology | In progress |
| Claude Cowork skills | 50–100 | Very low | /install | Quick win |
| BIZBOK value stream | 50–100 | Very low | /methodology | Quick win |

### Long-tail keywords (low competition, high conversion)

| Keyword | Target page | Priority |
|---------|-------------|----------|
| free business capability map generator AI | / | High |
| how to create a capability map from a pitch deck | /case-study | High |
| business architecture for business analysts | /methodology | High |
| BABOK grounded capability mapping tool | /methodology | Medium |
| value stream for pizza delivery business | /case-study | Low (demonstration) |
| capability map Excel template BIZBOK | /skills | High |
| claude cowork business architecture plugin | /install | Quick win |

### Community keywords (forum / discussion intent)

These won't drive direct search traffic but inform content strategy:
- "capability map vs process map"
- "how to do business architecture on a project"
- "IIBA business architecture techniques"
- "value stream vs process flow BA"
- "business object model technique"

---

## Page-by-page SEO targets

### / (Home)
**Target:** Capability map generator, business architecture AI tool  
**Current title:** PlausibleBA — Free Business Architecture Skills for Claude Cowork  
**Gaps:** No Open Graph image, no canonical tag  
**Content gap:** No mention of IIBA, Guild, BABOK on the home page — add credibility signals

### /skills
**Target:** Business capability map template, value stream mapping tool, concept model  
**Gaps:** Page is light on text — Google may see it as thin content  
**Content gap:** Add a short descriptive paragraph per skill with keywords naturally embedded

### /install
**Target:** Claude Cowork plugin, how to install business architecture skills  
**Schema:** HowTo markup added ✅  
**Gaps:** FAQ section would add rich result eligibility  

### /methodology
**Target:** BIZBOK methodology, Capsicum Triad, business architecture framework  
**Gaps:** Strong content already — needs internal links from other pages  
**Content gap:** Add a comparison section: PlausibleBA vs Ardoq vs LeanIX (low effort, long-tail traffic)

### /case-study
**Target:** Business capability map example, value stream example, capability map pizza delivery  
**Schema:** Article markup added ✅  
**Gaps:** This page has the most unique content — it will rank for long-tail terms over time  
**Content gap:** Add alt text to any images, add more domain-specific keyword context in the input text section

### /canvas
**Target:** Business architecture canvas, operating model visualisation tool  
**Gaps:** Very light on crawlable text — the canvas UI is mostly JavaScript  
**Fix:** Add a static description section above the upload zone with keyword-rich text

---

## Backlink strategy

### Quick wins (0–30 days)
- [ ] Submit to Anthropic plugin directory (done — pending approval) — high-authority backlink
- [ ] GitHub README links to plausibleba.com — already in place
- [ ] Add plausibleba.com to your LinkedIn profile and Terry Roach's personal site/bio
- [ ] Substack articles should link back to plausibleba.com (not just mention it)
- [ ] IIBA member directory / profile if available

### Medium term (30–90 days)
- [ ] Guest post on BA Times or Modern Analyst — both accept contributed articles
- [ ] Guild Summit mention in any official summary or newsletter
- [ ] Ask Henrik Ekstam (Escaping Sisyphus) to mention PlausibleBA in relevant context
- [ ] Prof Asif Gil — UTS research page mention or academic paper reference
- [ ] Submit to product directories: Product Hunt, Futurepedia, There's An AI For That

### Long term (90+ days)
- [ ] IIBA chapter website mentions — approach chapter leaders directly post-Summit
- [ ] Enterprise architecture blogs: EA Principals, Conexiam, The Open Group
- [ ] Academic citations if governance paper gets arXiv listing

---

## Content plan

### Blog posts to write (on plausibleba.com, not Substack)
These build domain authority directly. Each post targets a specific keyword cluster.

| Title | Target keyword | Priority | Status |
|-------|---------------|----------|--------|
| "What is a Business Capability Map? A BA's guide" | business capability map | High | Not started |
| "BABOK Value Streams vs Process Flows — what's the difference?" | BABOK value stream | High | Not started |
| "How to do business architecture on a project without being a business architect" | business architecture for business analysts | High | Not started |
| "The Capsicum Triad: classifying business objects in three types" | business concept model | Medium | Not started |
| "From pitch deck to operating model in one Cowork session" | capability map generator AI | High | Not started |
| "BIZBOK for Business Analysts: just enough to be dangerous" | BIZBOK business analyst | Medium | Not started |

### Blog setup needed
- Create /blog directory with index page
- Simple article template matching site styles
- Add Blog to nav (or keep it in footer only to avoid nav clutter)

---

## Social SEO signals

### Open Graph (needed for LinkedIn/Twitter previews)
Add to all pages:
```html
<meta property="og:title" content="PAGE TITLE">
<meta property="og:description" content="PAGE DESC">
<meta property="og:image" content="https://www.plausibleba.com/og-image.png">
<meta property="og:url" content="https://www.plausibleba.com/PAGE">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

### OG image needed
A 1200×630px image for social sharing previews. Should show the PlausibleBA name, tagline, and a screenshot of one of the visualisations. Use when posting links on LinkedIn — dramatically improves click-through rate.

---

## Google Search Console setup

**Do this immediately:**
1. Go to search.google.com/search-console
2. Add property: URL prefix → https://www.plausibleba.com
3. Verify via HTML file (upload to GitHub repo root) or DNS TXT record
4. Submit sitemap: https://www.plausibleba.com/sitemap.xml
5. Check Coverage report after 48 hours — confirm all pages indexed

**Also register:**
- Bing Webmaster Tools: bing.com/webmasters (submit same sitemap)

---

## Tracking & milestones

### Plausible Analytics — metrics to watch
- Unique visitors per week
- Top pages (which skills pages are most visited)
- Referral sources (LinkedIn, GitHub, direct, search)
- Install page conversion (visits to install page / total visits)

### Search Console — metrics to watch (once registered)
- Total impressions (how often plausibleba.com appears in search)
- Click-through rate by page
- Average position for target keywords
- Pages with crawl errors

### 90-day SEO milestones

| Milestone | Target date | Status |
|-----------|-------------|--------|
| Google Search Console registered + sitemap submitted | 18 Mar 2026 | Not started |
| All pages indexed in Google | 25 Mar 2026 | Not started |
| First organic search visitor (any keyword) | April 2026 | Not started |
| Ranking in top 50 for "Claude Cowork business architecture" | April 2026 | Not started |
| Ranking in top 20 for "capability map generator AI" | June 2026 | Not started |
| 100 organic visitors/month | June 2026 | Not started |
| First blog post published | April 2026 | Not started |
| Open Graph tags on all pages | 18 Mar 2026 | Not started |
| Product Hunt launch | April 2026 | Not started |

---

## Immediate actions (do tomorrow)

1. **Register Google Search Console** — search.google.com/search-console — verify domain, submit sitemap
2. **Add Open Graph tags** to all pages — needed before any more LinkedIn posts so link previews show properly
3. **Create OG social image** — 1200×630px — for LinkedIn link previews
4. **Register Bing Webmaster Tools** — 5 minutes, same sitemap
5. **Add PlausibleBA URL to LinkedIn profile** — easy backlink + drives traffic from posts

---

*Strategy doc maintained by Terry Roach. Update the tracking table after each milestone.*
