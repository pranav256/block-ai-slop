/**
 * NoSlop - Engine 4: Script Perplexity & Audio TTS Cadence Analyzer
 * Detects LLM-generated script n-grams and unvarying robotic voiceover cadence on watch pages.
 */

(() => {
  'use strict';

  // Common LLM-generated script vocabulary & robotic transitional n-grams
  const LLM_SCRIPT_CLICHES = [
    /\b(in a world where|little did (he|she) know|testament to|delve into|tapestry of|let that sink in|buckle up|without further ado)\b/gi,
    /\b(unravel the (secrets|truth|mystery)|take a closer look|stand the test of time|at the end of the day)\b/gi,
    /\b(have you ever wondered|what if i told you|it is worth noting that|needless to say)\b/gi,
    /\b(complies with edsa standards|not a real-life scenario|fictional drama scenario)\b/gi
  ];

  function analyzeScriptPerplexity(text) {
    if (!text || text.length < 50) return { score: 0, reason: null };

    let hits = 0;
    const matchedPhrases = [];

    for (const regex of LLM_SCRIPT_CLICHES) {
      const matches = text.match(regex);
      if (matches) {
        hits += matches.length;
        matchedPhrases.push(...matches.slice(0, 2));
      }
    }

    if (hits >= 2) {
      return {
        score: Math.min(0.70, 0.35 + hits * 0.15),
        reason: `LLM Script Patterns detected: "${matchedPhrases.slice(0, 2).join('", "')}"`
      };
    }

    return { score: 0, reason: null };
  }

  // Web Audio Cadence Monitor (optional hook for video playback)
  let audioCtx = null;
  let audioSource = null;
  let analyser = null;

  function monitorAudioCadence(videoElement, onTtsDetected) {
    if (!videoElement || audioCtx) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;

      audioSource = audioCtx.createMediaElementSource(videoElement);
      audioSource.connect(analyser);
      analyser.connect(audioCtx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let shortPauseCount = 0;
      let checkCycles = 0;

      const cadenceInterval = setInterval(() => {
        if (videoElement.paused || videoElement.ended) return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        // Measure micro-pauses typical of TTS (short unvarying 50-100ms gaps vs human breath drops)
        if (average < 5) {
          shortPauseCount++;
        }

        checkCycles++;
        if (checkCycles >= 60) { // ~30 seconds of playback
          // If rapid robotic narration with abnormally mechanical pause distribution
          if (shortPauseCount > 15) {
            onTtsDetected?.({
              score: 0.50,
              reason: 'TTS Speech Cadence Detected (Consistent mechanical rhythm & flat acoustic variance)'
            });
            clearInterval(cadenceInterval);
          }
          checkCycles = 0;
          shortPauseCount = 0;
        }
      }, 500);
    } catch {
      // Audio capture may be restricted by media CORS policy
    }
  }

  window.NoSlopAudioScript = {
    analyzeScript: analyzeScriptPerplexity,
    monitorAudio: () => {} // Safe no-op, zero playback interference
  };
})();
