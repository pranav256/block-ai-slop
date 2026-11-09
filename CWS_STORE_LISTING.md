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
Detect low-effort generated content on YouTube with local statistical scoring and optional model training data.
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

NoSlop is a privacy-first adblocker-style extension that scores YouTube feed, search, and recommendation cards using local statistical features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 WHY NOSLOP IS DIFFERENT: CREATOR-SAFE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Most naive filters block anything with the word "AI" or any video with an AI-generated thumbnail. That breaks real human science educators (like Neil deGrasse Tyson on StarTalk, Steven Bartlett on The Diary Of A CEO, or Veritasium) who discuss AI topics or use Midjourney art in thumbnails.

NoSlop solves this with a multi-signal detection pipeline:
• Local hybrid decisions: native synthetic disclosures, exact community matches, generation text/hashtags, and genre heuristics.
• Trained text features: hashed n-grams and style statistics, with an evidence gate before contributing a score.
• Verified-channel protection by default, except for native synthetic disclosures; personal allow/block choices take priority.
• Human-First Defaults: Visual thumbnail scanning is disabled by default to protect creators using AI artwork.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 4-ENGINE DETECTION ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hybrid Scoring Engine:
   • Uses native synthetic disclosures, generation text/hashtags, and genre heuristics.
   • Adds trained character similarity and style evidence when earlier signals do not already block.

2. Community Blocklist:
   • Directly matches indexed channels and video IDs; a bounded sample also seeds the text model.
   • Community data can be refreshed from GitHub every 6 hours.

3. Script Statistics:
   • Measures generic repetition, lexical diversity, sentence rhythm, and punctuation regularity.

4. 1-Click Hover Actions:
   • Hover over any video card on YouTube to apply a personal override or report it with a pre-filled GitHub issue.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 100% PRIVACY FIRST & IN-MEMORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Zero tracking, zero telemetry, zero analytics.
• 100% in-memory local processing inside your browser sandbox.
• No automatic browsing-history collection or upload. User-selected reports stay local and can open a pre-filled GitHub issue.
• Fully open-source under the MIT license on GitHub: https://github.com/pranav256/block-ai-slop

Take back your YouTube feed today with NoSlop!
```

---

## 3. Privacy & Justification Questionnaire (For Chrome Web Store Review)

When submitting, Google requires you to answer specific compliance questions in the **Privacy** tab:

### Single Purpose Description
```
NoSlop has a single focused purpose: to score and hide low-effort generated content using local statistical analysis on YouTube feeds and search results.
```

### Permission Justifications

#### `storage` & `unlimitedStorage`
```
Required to store user filter preferences, sensitivity, personal overrides, and optional local model training data without hitting browser quota restrictions.
```

#### `tabs`
```
Used solely to update the extension action toolbar badge with the live count of blocked AI videos on the user's active YouTube tab.
```

#### `alarms`
```
Used to schedule optional model training data refresh every 6 hours without running a persistent background polling loop.
```

#### Host Permissions: `*://*.youtube.com/*`
```
Required to run content scripts on YouTube pages to inspect video metadata and hide cards whose statistical score exceeds the selected threshold.
```

#### Host Permissions: `*://*.ytimg.com/*` and `*://*.ggpht.com/*`
```
Required to optionally load video thumbnail image bitmaps into an offscreen HTML5 canvas element for local texture analysis only if the user explicitly enables the experimental visual thumbnail engine.
```

### Remote Code Justification
* **Does this extension use remote code?**
  👉 **Select "No"**. All code is bundled locally inside the extension package conforming strictly to Manifest V3 requirements. Optional training data is retrieved strictly as static JSON via fetch.

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
