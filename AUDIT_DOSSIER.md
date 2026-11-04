# 🛡️ NoSlop — Technical Architecture, Audit Dossier & Algorithmic Critique

> **Auditor Notice for GPT-6 Astra:**  
> This dossier contains the complete architectural breakdown, engineering history, mathematical formulation, known vulnerabilities, and foolish design compromises of **NoSlop v5.0.0** (a client-side Chromium extension designed to eliminate AI-generated slop from YouTube).  
> **Be as brutal, unvarnished, and mathematically rigorous as possible.** If an implementation choice is fragile, naive, or computational malpractice, roast it and provide a mathematically superior, low-latency alternative.

---

## 1. Executive Summary & Objective

**NoSlop** is an open-source, client-side Manifest V3 browser extension for YouTube. Its goal is to eradicate automated generative content mills ("AI slop") across all genres—melodrama reels, fake Stoic/Marcus Aurelius motivation, sensationalist "James Webb broke physics" pseudoscience, automated Reddit TTS loops, and AI brainrot—**without harming legitimate human creators** (e.g., tech reviewers, educational channels, and science communicators discussing AI).

### Core Performance Constraints
1. **$O(1)$ Runtime Latency:** Must evaluate cards in sub-millisecond time (< 0.05 ms per card) to avoid dropping below 60 fps during high-speed feed scrolling.
2. **Zero Polling Loops:** No `setInterval` DOM polling. Purely reactive via `IntersectionObserver` and debounced `MutationObserver`.
3. **Strict Memory Cap:** Extension footprint must remain under 25 MB RAM total, even with 46,000+ blocklisted channels loaded into memory.
4. **Creator Safety / Zero False Positives:** Must never block human creators (like *Veritasium*, *StarTalk*, *Einzelgänger*, or *Techy Imran* reviewing laptops) simply because they mention AI or use AI art in a thumbnail.

---

## 2. System Architecture & Detection Pipeline

```mermaid
flowchart TD
    A[YouTube DOM Feed / Search / Shorts] --> B[IntersectionObserver: Is Card in Viewport?]
    B -- No (Offscreen) --> C[Sleep until scrolled into view (0% CPU)]
    B -- Yes (Visible) --> D[Extract Metadata: Title, Channel, Snippet, Disclosures]
    
    D --> E{Whitelisted?}
    E -- Yes (Verified Badge / Educational Whitelist) --> Allow[Status: CLEAN / Visible]
    
    E -- No --> F{Engine 3: Community Consensus Hash Lookup}
    F -- Channel Handle/ID Match (O(1)) --> Block[Status: BLOCKED]
    
    F -- Clean --> G{YouTube AI Info Button Present?}
    G -- Yes ('How this content was made') --> Block
    
    G -- No --> H[Engine 1: Multi-Signal Bayesian Scoring Engine]
    H --> I[Bayesian Independence Formula: P = 1 - ∏ (1 - Pi)]
    I --> J{P >= Sensitivity Threshold? (Default: 0.50)}
    J -- Yes --> Block
    J -- No --> Allow
    
    Block --> K{Placeholder Mode Active?}
    K -- Yes --> L[Render Compact 'AI Hidden' Bar + 'Show' Button]
    K -- No --> M[Zero-Height AdBlock Collapse (display: none !important)]
    
    Allow --> N[Inject 1-Click [⚑ Slop] Action Pill next to 3-Dots]
```

---

## 3. Mathematical & Algorithmic Formulation

### 3.1 Multi-Signal Bayesian Scoring Engine (`scoringEngine.js`)

Instead of linear additive weights (which can easily overflow or cause threshold clipping), NoSlop models detection as a **Bayesian accumulation of independent conditional probabilities**:

$$P(\text{Slop} \mid E_1, E_2, \dots, E_k) = 1 - \prod_{i=1}^k \left(1 - P(E_i)\right)$$

Where each signal $E_i$ carries an empirically tuned posterior probability weight $P(E_i) \in [0.0, 1.0]$:

| Signal ID | Description | Weight $P(E_i)$ | Trigger Condition |
| :--- | :--- | :---: | :--- |
| **$S_{\text{disclosure}}$** | Native YouTube Synthetic Media Button | `1.00` | Card contains `button[aria-label*="How this content was made"]` |
| **$S_{\text{hashtag}}$** | Greedy AI Slop Hashtag | `0.95` | `/(?:^\|[^\w])#ai(story\|drama\|film\|art\|voice\|cover\|slop\|philosophy\|stoic)\b/i` |
| **$S_{\text{disclaimer}}$** | Automated Script / Generator Boilerplate | `0.90` | EDSA disclaimers, `"voice generated with ElevenLabs"`, Midjourney/ChatGPT notes |
| **$S_{\text{channel\_kw}}$** | Explicit Generative Channel Name | `0.85` | Channel matches `/(stoic mindset ai\|cosmo space ai\|daily ai recap)/i` |
| **$S_{\text{title\_kw}}$** | Compound Generative Title Keyword | `0.85` | Title matches compound phrases (`"ai generated"`, `"minidrama"`, `"ai voice cover"`) |
| **$S_{\text{snippet\_kw}}$** | Snippet/Card Text Generative Keyword | `0.75` | Card text contains generative phrases |
| **$S_{\text{cliche}}$** | Slop Snippet Clichés | `0.65` | Common automated copy formulas |
| **$S_{\text{formula}}$** | Domain-Specific Clickbait / Plot Formula | `0.55` | Melodrama, Pseudo-Stoic, Space Sensationalism, Reddit TTS, Brainrot |
| **$S_{\text{caps}}$** | Sensational All-Caps Badges | `0.40` | `\b(MAFIA BOSS\|BILLIONAIRE\|REVENGE\|SHOCKING)\b` |

#### Threshold Sensitivity Gating
The final composite probability $P$ is compared against user sensitivity:
* **Aggressive:** $\tau = 0.35$
* **Balanced (Default):** $\tau = 0.50$
* **Conservative:** $\tau = 0.65$
* **Shorts Dynamic Boost:** If a card is a Short and `"AI Shorts"` is enabled, $\tau = \min(\tau, 0.40)$.

---

### 3.2 Community Consensus Multi-Index Hash Table (`communityEngine.js`)

* **Database Scale:** 46,878 verified automated/generative channels merged from **AiSList** (`Override92`), **Cevval AI Music Blocklist**, and **DeSlop**.
* **Storage & Indexing:** Stored as three disjoint native V8 `Set` objects:
  1. `remoteHandles`: Set of normalized `@handles` (e.g. `@dramadiary`, `@velvetromance`).
  2. `remoteChannelIds`: Set of YouTube channel IDs (`UC...`).
  3. `remoteNames`: Set of homoglyph-normalized lowercase channel names.
* **Homoglyph Normalization:** Replaces visually identical Cyrillic/Greek characters (`а` $\rightarrow$ `a`, `о` $\rightarrow$ `o`, `р` $\rightarrow$ `p`, `с` $\rightarrow$ `c`) and fixes common evasions like `"Hero Al"` (with lowercase `L`) $\rightarrow$ `"Hero AI"`.
* **Complexity:** Lookups execute in $O(1)$ constant time ($\sim 0.001 \text{ ms}$ per card).

---

### 3.3 DOM Orchestration & Lazy Viewport Evaluation (`content.js`)

* **Viewport Evaluation:** Standard `IntersectionObserver` with a `rootMargin: '300px 0px 300px 0px'`. Only the 6 to 15 cards approaching the viewport are evaluated. Offscreen cards consume **0 ms CPU**.
* **Mutation Observer Debounce:** `MutationObserver` watches `document.body` for child additions, filtered strictly to ignore NoSlop's own nodes (`.noslop-title-actions`, `.noslop-placeholder`, `.noslop-toast`), debounced to **150 ms**.
* **Signature Cache:** Every card is tagged with `data-noslop-sig="${title}||${channel}||${snippet.slice(0,30)}"`. If YouTube's Polymer engine hydrates the channel name 80 ms after initial DOM stamping, the signature mismatch triggers a seamless re-evaluation without unhiding.

---

## 4. Post-Mortem of Real Bugs (The "Don't Do This Again" File)

Before redesigning the algorithm, Astra should understand the real-world potholes we stepped into:

| Bug Encountered | Root Cause | Fix Applied |
| :--- | :--- | :--- |
| **`MAX_WRITE_OPERATIONS_PER_MINUTE` Quota Crash** | Calling `chrome.storage.sync.set({ stats })` inside `onMessage` for every blocked card. Exceeded 120 sync writes/min. | Moved stats to `chrome.storage.local` with an in-memory buffer and a 2.5-second debounce flush timer. |
| **Silently Broken Engine 1 (`TypeError`)** | `scoringEngine.js` exported `{ calculate }`, but `content.js` called `window.NoSlopScoring.calculateScore(...)`. Content script silently crashed on every card. | Aliased both methods and added fallback guard `scoreFn = calculateScore \|\| calculate`. |
| **Polymer Hydration Race Condition** | Top search cards stamped empty titles/channels initially. Lazy observer marked them "clean" and unobserved before Polymer finished hydration. | Re-check signature on DOM changes; do not finalize status if `meta.channelName` is empty. |
| **"Show Anyway" Reveal Lockout** | Reveal button removed inline styles, but CSS rule `.noslop-hidden` and `[data-noslop-status="blocked"]` still matched with `display: none !important`. | Stripped `.noslop-hidden`, applied `data-noslop-status="revealed"`, and updated stylesheet selector rules. |
| **The Blanket Shorts Wipeout** | `if (meta.isShort && settings.blockShorts) return { isBlocked: true }` blanket-blocked all shorts, hiding legitimate laptop reviews (e.g. ASUS ExpertBook). | Removed blanket short-circuit; switched to strict sensitivity weighting ($\tau = 0.40$) so human shorts with score `0.0` always pass. |

---

## 5. Frank Self-Critique: Algorithmic Weaknesses & Vulnerabilities

Here are the glaring flaws and naive assumptions in our current implementation. **Astra, tear these apart:**

### Flaw 1: Regex-Based Fragility vs. Adversarial LLM Prompting
* **The Problem:** Formulaic regex matching (`MELODRAMA_SLOP_FORMULAS`, `PHILOSOPHY_SLOP_FORMULAS`) relies on specific English keywords and clichés.
* **Vulnerability:** A slop mill can evade regexes simply by altering word order, using passive voice, substituting synonyms (e.g. `"The tycoon disguised as an impoverished mendicant"` instead of `"pretended to be a beggar"`), or generating titles in Spanish, Hindi, or Portuguese.

### Flaw 2: Scale and Memory of the 46k+ Channel Hash Set
* **The Problem:** Storing 46,878 strings across 3 JavaScript `Set` objects consumes $\sim 15 \text{ MB}$ of V8 heap memory in every YouTube tab.
* **Vulnerability:** If the community list grows to 500,000 channels, this will consume $> 100 \text{ MB}$ per tab. We need a more compact probabilistic data structure (e.g. Bloom Filter or Cuckoo Filter) or indexed IndexedDB cache.

### Flaw 3: Lack of Semantic Vector Understanding
* **The Problem:** We cannot tell the *semantic difference* between:
  - *"Marcus Aurelius: 7 Rules to Become Dangerous (Stoicism)"* (Slop)
  - *"Marcus Aurelius: 7 Meditations on Personal Resilience"* (Legitimate lecture)
  except via brittle keyword rules (`become dangerous`, `destroy your enemies`).
* **Opportunity:** A quantized on-device embedding model (e.g., 8-bit MiniLM / MobileBERT via ONNX WebAssembly running in a WebWorker) could calculate cosine similarity against a vector centroid of known slop topics in $< 5 \text{ ms}$.

### Flaw 4: YouTube DOM Polymorphism (Polymer vs. Wiz Redesign)
* **The Problem:** YouTube constantly changes DOM element classes and component structures (`ytd-video-renderer` vs `yt-lockup-view-model` vs `ytm-shorts-lockup-view-model-v2`).
* **Vulnerability:** If YouTube deprecates `#video-title` in favor of obfuscated classes (`.yt-core-attributed-string`), text extraction could fail silently unless heuristics adapt dynamically.

---

## 6. Request for GPT-6 Astra: The Audit Plan & Questions

We invite GPT-6 Astra to address the following engineering challenges:

1. **Semantic Classification Without Heavy Weights:**
   How can we classify semantic slop (pseudo-philosophy, fake science, melodrama) with $> 95\%$ accuracy on-device without shipping a 50 MB PyTorch/ONNX binary? What is the most lightweight feature extraction pipeline feasible in a browser extension context?
2. **Compact Blocklist Data Structure:**
   What data structure (e.g., Counting Bloom Filter, Quotient Filter, Trie, or Perfect Hash Table) should replace the current 46k JavaScript `Set` to store 500k channels in $< 2 \text{ MB}$ with zero false-positive channel collisions?
3. **Multi-Modal Signal Fusion:**
   Beyond title and metadata, how can we cheaply extract perceptual signals from video frames (via Canvas DCT/FFT texture analysis) or audio samples without violating YouTube CORS or consuming significant GPU/CPU?
4. **Adversarial Resilience:**
   How should the scoring engine defend against automated prompt perturbations, zero-width spaces, and homoglyph evasion without exploding regex complexity?
5. **Decentralized Community Consensus:**
   How can users report missed slop and sync community blocklists peer-to-peer without central server hosting costs or GitHub issue spam?

---

*This dossier is maintained under `d:\block-ai-slop\AUDIT_DOSSIER.md` as of NoSlop v5.0.0.*
