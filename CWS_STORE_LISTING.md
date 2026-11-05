# Chrome Web Store Listing Information & Submission Kit

Use this document to quickly fill in the fields when submitting **NoSlop** to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 1. Store Listing Metadata

### Product Name (Max 45 chars)
```
NoSlop — AI Video Blocker for YouTube
```

### Short Description / Summary (Max 132 chars)
```
Block AI-generated slop, synthetic media, and automated drama channels on YouTube with community blocklists and smart scoring.
```

### Primary Category
```
Productivity  (Alternative: Accessibility or Photos & Video)
```

### Language
```
English (United States)
```

---

## 2. Detailed Store Description (Copy & Paste)

```markdown
Tired of your YouTube recommendations getting flooded with low-effort AI slop, fake billionaire drama compilations, automated reddit narration mills, and synthetic voiceovers?

NoSlop is an intelligent, privacy-first adblocker-style extension that cleans your YouTube feed, search results, and recommendations by eliminating automated AI content while strictly protecting legitimate human creators.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WHY NOSLOP IS DIFFERENT: CREATOR-SAFE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Most naive filters block anything with the word "AI" or any video with an AI-generated thumbnail. That breaks real human science educators (like Neil deGrasse Tyson on StarTalk, Steven Bartlett on The Diary Of A CEO, or Veritasium) who discuss AI topics or use Midjourney art in thumbnails.

NoSlop solves this with a multi-signal detection pipeline:
• Verified Creator Protection: YouTube-verified human creators are automatically whitelisted.
• Compound Phrases Only: Never blocks standalone "AI" as a topic—only explicit generative markers ("AI generated", "AI animation", "AI voiceover").
• Human-First Defaults: Visual thumbnail scanning is disabled by default to protect creators using AI artwork.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 4-ENGINE DETECTION ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Bayesian Heuristic Scoring Engine:
   • YouTube AI Disclosure Button: Catches native "How this content was made" and "Altered or synthetic content" labels.
   • Greedy AI Slop Hashtags: Filters out tags like #AIStory, #AIDrama, #AIFilm, #AIAnimation.
   • Script Disclaimers: Identifies automated boilerplate like "complies with EDSA standards" or "not a real-life scenario".
   • Melodrama Story Tropes: Detects mass-produced content patterns ("She called security on her ex... then the chairman", "Useless son-in-law is the Dragon King").
   • Homoglyph Normalization: Neutralizes typo evasion tricks (like substituting lowercase 'l' for 'I' in "Hero Al Dramas").

2. 46,800+ Community Blocklist (Engine 3):
   • Pre-bundled offline database of 46,800+ community-verified AI channels, bot handles, and synthetic music farms.
   • Sources include AiSList (Override92), Cevval AI Music Blocklist, and curated micro-drama platforms (DramaBox, ShortMax, ReelShort, Nov Drama, Hero AI Dramas).
   • Instant sub-millisecond O(1) hash lookup (<0.001 ms) ensures zero scroll stutter or frame drops.
   • Auto-syncs updates directly from GitHub every 6 hours.

3. Script & Audio Cadence Monitor:
   • Scans descriptions for LLM n-gram perplexity ("delve into", "a testament to").
   • Analyzes text-to-speech audio cadences for robotic pauses lacking natural breath intervals.

4. 1-Click Hover Actions:
   • Hover over any video card on YouTube to instantly "Block Channel" or "Report Slop" to the community blocklist with a pre-filled GitHub report.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% PRIVACY FIRST & IN-MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Zero tracking, zero telemetry, zero analytics.
• 100% in-memory local processing inside your browser sandbox.
• No video URLs or browsing history are ever collected, transmitted, or sold.
• Fully open-source under the MIT license on GitHub: https://github.com/pranav256/block-ai-slop

Take back your YouTube feed today with NoSlop!
```

---

## 3. Privacy & Justification Questionnaire (For Chrome Web Store Review)

When submitting, Google requires you to answer specific compliance questions in the **Privacy** tab:

### Single Purpose Description
```
NoSlop has a single focused purpose: to detect and remove low-effort, AI-generated spam, synthetic media disclosures, and automated story channels from YouTube feeds and search results.
```

### Permission Justifications

#### `storage` & `unlimitedStorage`
```
Required to store user filter preferences (sensitivity, engine toggles, custom keyword rules) and to store the bundled offline community blocklist of 46,800+ known AI slop channels locally in memory without hitting browser quota restrictions.
```

#### `tabs`
```
Used solely to update the extension action toolbar badge with the live count of blocked AI videos on the user's active YouTube tab.
```

#### `alarms`
```
Used to schedule the bundled community blocklist refresh every 6 hours without running a persistent background polling loop.
```

#### Host Permissions: `*://*.youtube.com/*`
```
Required to run content scripts on YouTube pages to inspect video metadata (titles, channel names, and native YouTube 'Altered or synthetic' disclosure badges) and remove detected AI slop elements from the DOM.
```

#### Host Permissions: `*://*.ytimg.com/*` and `*://*.ggpht.com/*`
```
Required to optionally load video thumbnail image bitmaps into an offscreen HTML5 canvas element for local texture analysis only if the user explicitly enables the experimental visual thumbnail engine.
```

### Remote Code Justification
* **Does this extension use remote code?**
  👉 **Select "No"**. All code is bundled locally inside the extension package conforming strictly to Manifest V3 requirements. Community blocklists are retrieved strictly as static JSON data via fetch.

### Data Usage Declarations
In the "Data usage" section:
* Check: **"I do not collect or use any user data"** (or certify that data is not sold or used for personalized advertising).

---

## 4. Privacy Policy URL
```
https://github.com/pranav256/block-ai-slop/blob/main/PRIVACY.md
```
*(Also available as a GitHub Pages or raw file if needed).*

---

## 5. Support / Contact URL
```
https://github.com/pranav256/block-ai-slop/issues
```
