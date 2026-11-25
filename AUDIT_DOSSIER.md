# NoSlop Algorithm and Validation Notes

Last updated: November 25, 2026. Runtime version: 5.1.0.

## What changed

The previous classifier trained on the first 500 community channel strings and compared videos against one broad centroid. It had no representative video-text controls, lost local learning on some rule changes, and could not combine supporting signals. The feed pipeline also missed descriptions/channel IDs and could hide an entire Shorts shelf or reuse a stale decision.

Version 5.1 fixes these paths. It remains a local heuristic filter, not an AI-authorship verifier. A 99% real-world removal rate has not been established.

## Decision order

1. Matching personal allow rules win. If an allow entry uses a channel ID absent from the card, public metadata is requested before applying other blocks when possible.
2. Matching personal channel blocks work independently of community filtering.
3. Native synthetic badges, explicit production disclosures and exact community matches can block verified channels. Verification protects against weaker guesses, not explicit evidence.
4. Context checks distinguish production disclosures from tutorials, investigations, quoted topics, negations and ambiguous tool names such as Runway or Sora.
5. Specific content-mill formulas cover drama, automated Reddit narration, sensational discovery claims, manipulation bait, synthetic animal stories, brainrot characters and automated income spam. These are filtering policies; a genre formula is not proof of AI authorship.
6. Rules and learned text similarity share a single text vote (their maximum). Separate provenance/hashtag and channel-identity votes combine as `1 - product(1 - vote)`. These are filtering strengths, not calibrated probabilities or a statistical independence claim.
7. Strong repetition can block only with supporting text evidence. Sentence boundaries are measured before punctuation is removed. The optional thumbnail engine remains disabled by default.
8. For undecided cards, a bounded public watch-page lookup supplies the full description and exact channel ID, then the same pipeline runs once more. Requests omit cookies, reject redirects and never retrieve the video/audio stream. Missing data leaves the local decision in place.

Sensitivity thresholds remain 0.35 (High), 0.50 (Balanced) and 0.65 (Low). AI Shorts caps the threshold at 0.40 without blanket blocking Shorts. Existing preferences are preserved.

## Text model

- `trainingData.js` contains 60 positive and 65 human-control examples written for this project. These are synthetic training seeds, not collected or independently labeled videos.
- Text uses signed, hashed character 3–5-grams, words and word pairs in 8,192 dimensions, with square-root frequency weighting and unit normalization.
- A prediction compares the three nearest examples on each side, emphasizing the closest example. This keeps different slop genres separate instead of blending them into a single centroid.
- The model abstains without eight positive examples, a human-control example, positive similarity of 0.38 and a positive-versus-human margin of 0.10. These thresholds are heuristic, not calibrated from a representative population.
- Local feedback is deduplicated by normalized text; the newest label wins. Up to 2,000 examples persist locally and are replayed after rule/corpus changes and across tabs. Prediction retains at most 256 prototypes per label, preserving the built-in controls, plus 256 cached predictions.
- Channel IDs and handles are exact identity evidence, not video-training examples. Encoded handles are decoded, handle punctuation stays distinct and channel-ID case is preserved. Display-name matches remain ambiguous.

## Feed and network handling

- Cards are evaluated near the viewport. Nested Shorts hosts resolve to one grid item, so they are counted and processed once. Both legacy and current grid shelves remain intact when an individual Short is hidden.
- Current lockup classes, legacy cards and mobile Shorts share metadata extraction. Accessibility title text is not mistaken for a native synthetic badge.
- Metadata signatures exclude extension-injected UI. Statistics/report-queue writes do not reset the detector.
- Hidden cards retain their decision until the next one is ready. Recycled nodes, late text-only hydration and offscreen cards are rechecked; Show applies only to the revealed video.
- Inline styles are saved and restored rather than clearing YouTube's layout properties. Asynchronous results are discarded after a settings change or node recycling.
- Public metadata is limited to two concurrent requests, 24 queued requests, six seconds and 3 MB per response. An in-memory cache retains at most 256 results, normally for 30 minutes. Failures cache briefly; rate limits or network errors pause new requests. The cache disappears when the worker stops.
- Only the requested video's player JSON is read, with balanced JSON parsing and a matching video-ID check. Page scripts and recommendation metadata are never executed or treated as the video's disclosure.

## Checks run

`node scripts/test-detector-quality.js` exercises 38 slop and 42 human-content controls on unseen channel names. Both Balanced and High pass all 80 handwritten regression cases. The initial 78-case suite exposed 26 missed slop cases and nine human false positives in the old code; two extra ambiguous-tool controls were subsequently added. This measures regression coverage, not generalization to a real YouTube feed.

All `scripts/test-*.js` programs cover scoring, abstention, feedback replay/correction/bounds, identity matching, public-metadata parsing, request deduplication, concurrency, failure handling, byte limits, backoff, script sentence boundaries, toggles and personal overrides.

`node scripts/cdp-benchmark.js` runs the actual scripts and CSS in headless Chromium against a DOM fixture with mocked Chrome APIs and metadata responses. It checks modern/legacy cards, native labels, Shorts/shelf isolation, late hydration, recycled and revealed cards, settings changes, restored layout styles, public description/ID decisions, personal ID allows and scrolling. It separately verifies the real unpacked extension service worker and popup with native Chrome storage. No mocked result is presented as live-feed detection accuracy.

A local Node run of 5,000 unique-title scores measured about 0.416 ms per card and 6.82 MB additional heap after GC with the bundled 46,884-entry index and 125 training seeds. This is a scorer microbenchmark, not browser idle CPU, network latency or a long-session memory guarantee. Use `node --expose-gc scripts/benchmark-performance.js` to repeat it.

## Limits and next measurement

An earlier public watch-page probe hit Google's challenge/rate-limit response (HTTP 429), and the detector failed open. A subsequent native Chromium test on November 25 successfully loaded real YouTube searches and retrieved the ASUS test video's description and channel ID through the extension worker.

The live test exposed duplicate decisions on nested `ytm-shorts-lockup-view-model` / `ytm-shorts-lockup-view-model-v2` components. They now resolve to the surrounding grid item, with fixture coverage for both nested hosts and shelf isolation. A subsequent live run reported zero nested decisions and zero visibly displayed blocked cards: 14 of 15 processed cards were blocked on an AI short-film search, while all nine processed cards remained visible on a NASA/James Webb search. These are observed filtering counts, not manually labeled accuracy. One tutorial-titled result matched the community blocklist and was hidden; that is a possible false positive requiring review rather than evidence of perfect creator protection.

`node scripts/live-browser-test.js` repeats this native smoke test without mocked Chrome APIs or page data. It uses an isolated temporary profile and reports unavailable/challenged YouTube access as inconclusive (exit code 2), not a passing live test.

A useful 99% target needs a representative labeled video corpus, separate unseen-channel/language evaluation, measured recall and false-positive rates, and threshold calibration. Metadata alone cannot reliably identify an unlabeled generated video with an ordinary title, no identifying channel match and no production disclosure. Better media-level provenance/classification would require a separately validated approach; the existing pixel-texture heuristic is not that approach.

The release package must be rebuilt after source changes with `node scripts/build-extension-zip.js`. No Chrome Web Store submission or deployment is performed by these scripts.
