# Privacy Policy for NoSlop — AI Video Blocker for YouTube

**Last updated:** November 2, 2026

## 1. Overview
NoSlop ("we", "our", or "the extension") is an open-source browser extension developed to hide and filter out low-effort, AI-generated content, synthetic media disclosures, and automated story mills on YouTube.

We believe your browsing activity is your private business. **NoSlop does NOT collect, track, store, or sell any personal information or browsing history.**

---

## 2. What Data We Collect
**Zero personal data.** Specifically:
* **No Personally Identifiable Information (PII):** We do not collect names, email addresses, IP addresses, location data, or device identifiers.
* **No Browsing History or Search Tracking:** We do not track or record what videos you watch, what you search for, or what channels you subscribe to.
* **No Telemetry or Analytics:** We do not embed Google Analytics, Mixpanel, Sentry, or any third-party analytics trackers.

---

## 3. How the Extension Operates (100% In-Memory Local Processing)
All detection mechanisms operate strictly on your local machine inside the browser:
* **DOM Inspection:** The content script inspects video titles, channel names, and YouTube's native metadata disclaimers (e.g., "Altered or synthetic content") directly within the active YouTube tab to calculate whether a card is AI-generated slop.
* **Local In-Memory Evaluation:** Metadata strings are evaluated in RAM using regular expressions and hash set lookups. Once a video card is evaluated, the result is cached only for the duration of the page session.
* **No Server Processing:** Video titles or URLs are never transmitted to any external server or LLM for processing.

---

## 4. Permissions Justification
Under Google Chrome Web Store Developer Policies, NoSlop requests only the minimum permissions necessary to function:

| Permission | Purpose |
| :--- | :--- |
| `storage` & `unlimitedStorage` | Used strictly to store your filter toggles, sensitivity threshold, custom keywords, and the offline community blocklist locally on your device. |
| `tabs` | Used solely to update the extension action badge with the count of blocked videos on the current active YouTube tab. |
| Host: `*://*.youtube.com/*` | Required to run content scripts on YouTube pages to detect and hide AI video elements. |
| Host: `*://*.ytimg.com/*` & `*://*.ggpht.com/*` | Required solely to fetch thumbnail images in-memory via HTML5 Canvas if the user explicitly enables the experimental visual texture engine. |

---

## 5. Network Requests & Third-Party Services
The extension makes only one type of external network request:
* **GitHub Community Blocklist Sync:** Every 6 hours (or when you click "Sync Now" in the control panel), the background service worker sends an HTTP GET request to:
  `https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json`
  This request retrieves the latest public list of crowdsourced AI channels. No user identifier, token, or search history is attached to this request.

---

## 6. Open Source Transparency
NoSlop is entirely open-source under the MIT License. The complete source code, build scripts, and blocklists can be independently audited at:
[https://github.com/pranav256/block-ai-slop](https://github.com/pranav256/block-ai-slop)

---

## 7. Contact & Inquiries
If you have any questions, feedback, or concerns regarding this privacy policy, please open an issue on GitHub:
[https://github.com/pranav256/block-ai-slop/issues](https://github.com/pranav256/block-ai-slop/issues)
