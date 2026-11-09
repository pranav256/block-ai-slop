# 🏪 Complete Chrome Web Store Publishing Guide for NoSlop

This step-by-step guide walks you through publishing **NoSlop** to the official **Google Chrome Web Store**.

Everything you need has been prepared and generated in your repository:
* 📦 **Production ZIP:** [`dist/noslop-v5.0.0-chrome-web-store.zip`](dist/noslop-v5.0.0-chrome-web-store.zip) *(Manifest V3 strictly validated)*
* 🎨 **Store Graphics:** [`store_assets/`](store_assets) *(Tiles & Screenshots at exact 1280x800, 920x680, and 440x280 resolutions)*
* 📜 **Privacy Policy:** [`PRIVACY.md`](PRIVACY.md) *(Mandatory for CWS approval)*
* 📋 **Copy-Paste Listing Text:** [`CWS_STORE_LISTING.md`](CWS_STORE_LISTING.md)

The existing ZIP predates the November 9 algorithm fixes. Rebuild it with `node scripts/build-extension-zip.js` and validate the result before uploading.

---

## Step 1: Open Chrome Web Store Developer Dashboard
1. Go to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. If this is your first time publishing, Google will prompt you to:
   * Accept the Developer Agreement.
   * Pay a **one-time \$5 registration fee** (charged by Google to prevent spam accounts).

---

## Step 2: Upload the Extension ZIP Package
1. On your Developer Dashboard, click the blue **"New Item"** button in the top-right corner.
2. In the upload dialog, drag and drop the ready-to-publish ZIP file:
   ```
   d:\block-ai-slop\dist\noslop-v5.0.0-chrome-web-store.zip
   ```
3. The dashboard will automatically unpack the ZIP, validate `manifest.json`, and create your draft store listing.

---

## Step 3: Complete the Store Listing Tab

In the left sidebar, click **"Store listing"**:

### 1. Product Details
* **Name:**
  ```
  NoSlop — AI Video Blocker for YouTube
  ```
* **Summary (126 chars):**
  ```
  Detect low-effort generated content on YouTube with local statistical scoring and optional model training data.
  ```
* **Description:**
  Copy and paste the full formatted markdown description from [`CWS_STORE_LISTING.md`](CWS_STORE_LISTING.md#2-detailed-store-description-copy--paste).

### 2. Graphic Assets
Upload the pre-rendered graphics from the `store_assets/` and `icons/` folders:
* **Store Icon:** Upload `icons/icon128.png` (128 × 128 px).
* **Screenshots (1280 × 800 px):**
  * Screenshot 1: Upload `store_assets/screenshot-1-1280x800.png` (Clean YouTube feed & AdBlock hiding)
  * Screenshot 2: Upload `store_assets/screenshot-2-1280x800.png` (Control panel & model training data)
* **Promotional Tiles:**
  * **Small promo tile (440 × 280 px):** Upload `store_assets/promo-small-440x280.png`.
  * **Large promo tile (920 × 680 px):** Upload `store_assets/promo-large-920x680.png`.

### 3. Categorization & Language
* **Category:** Select **Productivity** (or *Accessibility* / *Photos & Video*).
* **Language:** **English (United States)**.

---

## Step 4: Fill in the Privacy Practices Tab *(Crucial for Fast Approval)*

In the left sidebar, click **"Privacy practices"**:

### 1. Single Purpose Description
Enter:
```
NoSlop has a single focused purpose: to score and hide low-effort generated content using local statistical analysis on YouTube feeds and search results.
```

### 2. Permission Justifications
Copy and paste each justification exactly:
* **`storage` & `unlimitedStorage`:**
  ```
  Required to store user filter preferences, sensitivity, personal overrides, and optional local model training data without hitting browser quota restrictions.
  ```
* **`tabs`:**
  ```
  Used solely to update the extension action toolbar badge with the live count of blocked AI videos on the user's active YouTube tab.
  ```
* **`alarms`:**
  ```
  Used to schedule optional model training data refresh every 6 hours without keeping a persistent polling loop running.
  ```
* **Host Permission (`*://*.youtube.com/*`):**
  ```
  Required to run content scripts on YouTube pages to inspect video metadata and hide cards whose statistical score exceeds the selected threshold.
  ```
* **Host Permissions (`*://*.ytimg.com/*` and `*://*.ggpht.com/*`):**
  ```
  Required to optionally load video thumbnail image bitmaps into an offscreen HTML5 canvas element for local texture analysis only if the user explicitly enables the experimental visual thumbnail engine.
  ```

### 3. Remote Code Justification
* **Does this extension use remote code?**
  👉 Select **"No, I am not using remote code."** *(All scripts are bundled locally inside the extension package conforming to MV3 policies).*

### 4. Data Usage Disclosures
* Check the declaration: **"I do not collect or use any user data"**.
* Certify compliance with Google's Limited Use policy.

### 5. Privacy Policy URL
Enter your public GitHub privacy policy link:
```
https://github.com/pranav256/block-ai-slop/blob/main/PRIVACY.md
```

---

## Step 5: Distribution & Pricing Tab
1. Click **"Distribution"** in the left sidebar.
2. **Visibility:** Select **Public**.
3. **Pricing:** Select **Free**.
4. **Geographic Distribution:** Select **All regions** (or your preferred countries).

---

## Step 6: Submit for Review! 🚀
1. Click the blue **"Submit for review"** button at the top-right of the dashboard.
2. You will see a confirmation modal showing all checklist items checked green.
3. Click **"Submit"**.

Google's automated and human review typically completes in **24 to 48 hours**. Once approved, your extension will be live on the Chrome Web Store for millions of Chrome, Brave, Edge, and Arc users worldwide!
