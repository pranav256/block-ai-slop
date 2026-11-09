# NoSlop Architecture & Algorithmic Dossier

Last updated: November 9, 2026. Runtime manifest version: 5.0.0.

## Objective

Hide low-effort generated content while keeping human education, reviews, and interviews visible. Detection stays local, uses the existing lightweight engines, and runs through viewport and mutation observers rather than polling.

The detector is a hybrid of platform metadata, community matches, genre heuristics, and character n-gram similarity. Its scores are heuristic confidence values, not calibrated probabilities. Character similarity does not provide semantic understanding or a measured accuracy guarantee.

## Decision order

1. A personal allow entry wins over every block signal.
2. A personal channel block wins over automatic creator protection, even when community filtering is disabled. Names, handles, and channel IDs are supported.
3. A native YouTube synthetic-disclosure button blocks when scoring and disclosure filtering are enabled. A disclosure establishes synthetic/altered provenance, not necessarily low quality; blocking it is a filter policy.
4. Verified channels are protected from the remaining automatic engines when verified protection is enabled. Verification establishes channel identity, not human authorship.
5. With community filtering enabled, exact curated names and indexed community channel/video matches block. A curated phrase occurring inside a different channel name is insufficient.
6. Genre and disclosure heuristics supply a score. If that already reaches sensitivity, text vectorization is skipped. Otherwise the trained text model can contribute stronger evidence. Signals combine using their maximum, avoiding accumulation of correlated signals.
7. The script analyzer and optional thumbnail analyzer run if earlier stages did not block. Thumbnail analysis stays disabled by default.

Sensitivity thresholds remain 0.35 (aggressive), 0.50 (balanced), and 0.65 (conservative). Enabling the Shorts filter caps the threshold at 0.40; it does not block every Short.

## Completed corrections

- Restored `isVerified` and `hasAiInfoButton` extraction in the live content script. Scorer-only fixtures previously passed despite these inputs being absent on real cards.
- Cache signatures now include full snippets, channel links, badge/disclosure state, and other scoring inputs. Late metadata hydration invalidates an earlier decision.
- Identical title attributes and duplicate title/script fields no longer get counted repeatedly.
- Replaced the incorrect sparse running mean with a sum of normalized training vectors. Cosine similarity of that sum equals cosine similarity of the mean; absent features no longer keep a disproportionate weight from early examples.
- Model initialization compares the entire supplied corpus, so changes in its middle trigger retraining.
- The model abstains unless it has at least eight positive examples, positive similarity of at least 0.34, and a positive-minus-negative margin of at least 0.06. Channel similarity or repetitive formatting alone cannot bypass this gate.
- Ordinary philosophy words such as "lessons" and "habits", and science words such as "detected" and "discovered", no longer independently satisfy the genre rule. More specific sensational/manipulative phrases remain detectable.
- Removed curated-name substring blocking and shared personal-block matching across the community and live pipeline.

## Community index

The bundled corpus contains 46,884 entries. Remote channel handles, IDs, and names use sorted 32-bit hash arrays plus canonical strings. Lookups use binary search, so their complexity is O(log n), not O(1). A matching hash is checked against its string to resolve hash collisions; name normalization and ambiguous display names can still confuse identities.

## Verification and measurement

`node scripts/test-algorithm.js` covers centroid training order, corpus replacement, evidence abstention, educational-title controls, retained slop cases, skipped vectorization, metadata extraction/cache invalidation, creator protection, overrides, and clean Shorts. All nine `scripts/test-*.js` programs pass.

`node --expose-gc scripts/benchmark-performance.js` now loads normalization and the text model as well as the community/scoring engines. A November 9 local Node run scored 5,000 sample cards at about **0.233 ms per score**, with **4.29 MB additional heap** after GC and about **28.64 MB additional process RSS**. This batch includes verified and heuristic short circuits. It excludes DOM extraction, rendering, and browser overhead; it does not establish idle CPU, a browser memory cap, or long-session leak behavior.

The historical ~8 microsecond claim omitted the text model and cannot describe the complete scorer. The older audit's 0.05 ms target is not met by this measurement.

## Remaining algorithm work

- Build representative labeled video-title/description data, including unverified human controls and multiple languages, and measure precision/recall on held-out channels. Current semantic seeds are the first 500 community strings, largely channel handles, plus creator-name negatives; they are not a representative video classifier dataset.
- Calibrate thresholds from that evaluation. Broad AI hashtags, quoted generation disclosures, and genre patterns can still produce false positives; wording changes can evade them.
- Preserve and replay local learning examples when corpus or allowlist changes reset the model, and check behavior across tabs.
- Validate native badge selectors and metadata hydration on current desktop/mobile YouTube DOMs. The local extraction fixture is a stub, not a live-browser check.
- Audit canonicalization of case-sensitive channel IDs and encoded handles; exact hash collision resolution does not fix identity normalization.
- Review script rhythm statistics: sentence splitting currently follows punctuation-removing normalization, so the rhythm feature needs separate correction and tests.
- Rebuild the Chrome Web Store archive before release; the existing ZIP does not include these source changes.
