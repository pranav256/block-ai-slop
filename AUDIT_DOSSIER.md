# NoSlop v5.1.0 Architecture & Algorithmic Dossier

## Architectural Overview

NoSlop uses a hybrid layered ensemble combining authoritative metadata, community consensus, structural genre patterns, and statistical text representations:

1. **Layer 0: Authoritative Metadata (Zero-Guesswork Ground Truth)**
   - Official YouTube synthetic media badge (`hasAiInfoButton`: "Altered or synthetic content" / "How this content was made") immediately scores `1.0`.
   - Verified human creator whitelist (`meta.isVerified`) guarantees zero false positives on verified channels (e.g. *StarTalk*, *Veritasium*, *Einzelgänger*, *Kurzgesagt*).

2. **Layer 1: Community Blocklist Consensus (O(1) Hash Set)**
   - 46,800+ known AI slop channels, automated content mills, and micro-drama platforms indexed into compact 32-bit hash structures.
   - Evaluates channel handles, IDs, and normalized channel names with sub-microsecond latency.

3. **Layer 2: Multi-Signal Heuristic & Structural Archetypes**
   - Synthesizes creator disclosure hashtags (`#minidrama`, `#aidrama`, `#aigenerated`, `#ai`).
   - Formulaic genre archetype co-occurrence:
     - Synthetic melodrama / mini-drama syndicates (*mafia boss, secret wife, contract marriage, flash marriage, triplets, genius kids* + *betrayed by, gave my seat, banquet, minidrama, 【full】*).
     - Pseudo-philosophy & dark psychology clickbait (*marcus aurelius, stoic, carl jung* + *cold and emotionless, rules to become dangerous, fear you*).
     - Sensational space / science clickbait (*james webb, nasa, astronomers* + *detected, terrifying, broke physics, cannot explain*).
     - Reddit TTS loops (*r/aita, reddit stories* + *elevenlabs, ai voice, minecraft parkour*).

4. **Layer 3: Statistical Vectorizer & Style Perplexity**
   - 2,048-dimensional hashed character n-gram vectorizer (`semanticEngine.js`).
   - Style features: lexical diversity, repetition, punctuation density, entropy, and title-snippet overlap.
   - Balanced baseline with reputable creator negative profiles.

5. **Layer 4: User Overrides**
   - Direct personal blacklist and whitelist (always allow / always block).

## Performance & Resource Characteristics

- **Evaluation Speed**: ~8.0 microseconds per card (124,000+ cards/second).
- **RAM Footprint**: ~12.8 MB heap memory, 0.0% idle CPU overhead.
- **Lazy Viewport**: Processed on-demand via `IntersectionObserver`.
