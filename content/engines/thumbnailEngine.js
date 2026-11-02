/**
 * NoSlop - Engine 2: Thumbnail Visual & Texture Analysis
 * Samples thumbnail pixels via in-memory canvas to detect synthetic skin smoothing,
 * hyper-saturation, and diffusion aesthetic signatures.
 */

(() => {
  'use strict';

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Skin tone range in RGB / HSL
  function isSkinTone(r, g, b) {
    // Standard rule-based skin tone thresholding in RGB
    return r > 95 && g > 40 && b > 20 &&
           r > g && r > b &&
           (Math.max(r, g, b) - Math.min(r, g, b)) > 15 &&
           Math.abs(r - g) > 15;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  /**
   * Analyzes an <img> element for AI diffusion characteristics
   */
  async function analyzeThumbnail(imgEl) {
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) {
      return { score: 0, reason: null };
    }

    try {
      ctx.clearRect(0, 0, 48, 48);
      ctx.drawImage(imgEl, 0, 0, 48, 48);
      const imgData = ctx.getImageData(0, 0, 48, 48).data;

      let skinPixelCount = 0;
      let totalSkinSat = 0;
      let skinLuminances = [];
      let highContrastEdges = 0;

      for (let y = 1; y < 47; y++) {
        for (let x = 1; x < 47; x++) {
          const idx = (y * 48 + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];

          // Edge detection gradient against neighbor
          const rightIdx = (y * 48 + (x + 1)) * 4;
          const rDiff = Math.abs(r - imgData[rightIdx]);
          if (rDiff > 60) highContrastEdges++;

          if (isSkinTone(r, g, b)) {
            skinPixelCount++;
            const [, s, l] = rgbToHsl(r, g, b);
            totalSkinSat += s;
            skinLuminances.push(l);
          }
        }
      }

      // Check for characteristic Midjourney / Diffusion thumbnail signature:
      // 1. Prominent skin area (portraits/characters)
      // 2. High skin saturation (hyper-vibrant cinematic skin tones)
      // 3. Low luminance variance (unnaturally flat/plastic pore-less skin)
      // 4. Extreme dramatic rim-lighting / high contrast edges
      if (skinPixelCount > 150) {
        const avgSat = totalSkinSat / skinPixelCount;
        const meanLum = skinLuminances.reduce((a, b) => a + b, 0) / skinLuminances.length;
        const lumVariance = skinLuminances.reduce((sum, val) => sum + Math.pow(val - meanLum, 2), 0) / skinLuminances.length;

        // Plastic skin indicator: high saturation + abnormally smooth local variance + high edge ratio
        const edgeRatio = highContrastEdges / (48 * 48);
        if (avgSat > 0.45 && lumVariance < 0.035 && edgeRatio > 0.12) {
          return {
            score: 0.40,
            reason: 'AI Diffusion Portrait Visual Signature (Hyper-smooth plastic skin / cinematic rim-lighting)'
          };
        }
      }

      return { score: 0, reason: null };
    } catch {
      // Graceful fallback if cross-origin canvas security blocks reading pixels
      return { score: 0, reason: null };
    }
  }

  window.NoSlopVision = window.NoSlopThumbnail = {
    scanThumbnail: analyzeThumbnail,
    analyze: analyzeThumbnail
  };
})();
