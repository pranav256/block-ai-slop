const fs = require('fs');
const vm = require('vm');
const { performance } = require('perf_hooks');

console.log('='.repeat(65));
console.log('  NoSlop 5.0 - Performance & Resource Benchmark Harness');
console.log('='.repeat(65));

// 1. Measure Baseline Memory
if (global.gc) global.gc();
const baseMem = process.memoryUsage();

// 2. Load Engines
const blocklistData = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));

const sandbox = {
  window: {},
  console,
  setTimeout: () => {},
  clearTimeout: () => {}
};
vm.createContext(sandbox);
for (const name of ['textNormalization', 'semanticEngine', 'communityEngine', 'scoringEngine']) {
  vm.runInContext(fs.readFileSync(`content/engines/${name}.js`, 'utf8'), sandbox);
}

// Initialize the statistical model with the bundled training corpus.
sandbox.window.NoSlopCommunity.init([], blocklistData.channels, []);

const calculateScore = sandbox.window.NoSlopScoring.calculateScore;

// Measure Memory After Engine & 46k Database Loaded
if (global.gc) global.gc();
const loadedMem = process.memoryUsage();
const heapUsedMB = (loadedMem.heapUsed - baseMem.heapUsed) / (1024 * 1024);
const rssUsedMB = (loadedMem.rss - baseMem.rss) / (1024 * 1024);

console.log('\n📊 1. MEMORY FOOTPRINT (RAM USAGE):');
console.log(`   - Statistical model and training corpus:             ~${heapUsedMB.toFixed(2)} MB heap`);
console.log(`   - Total Process RSS (V8 + Strings + Regexes):      ~${rssUsedMB.toFixed(2)} MB`);
console.log(`   - Community entries:                              ${blocklistData.channels.length.toLocaleString()}`);
console.log(`   - Model samples:                                  ${JSON.stringify(sandbox.window.NoSlopSemantic.getModelStats())}`);

// 3. Benchmark CPU Evaluation Time
const sampleCards = [
  {
    title: "Marcus Aurelius: 7 Rules to Become Dangerous (Stoicism)",
    channelName: "Stoic Mindset",
    snippet: "Discover Marcus Aurelius's rules to become dangerous and rule your mind.",
    isVerified: false
  },
  {
    title: "How I Made $12,500 in 7 Days With ChatGPT and AI Automation",
    channelName: "AI Hustle Lab",
    snippet: "Step-by-step faceless YouTube channel on autopilot using AI tools.",
    isVerified: false
  },
  {
    title: "Why Scientists Are Terrified of What They Found in Antarctica",
    channelName: "Mystery Space",
    snippet: "What scientists found deep inside Antarctica permafrost will terrify you.",
    isVerified: false
  },
  {
    title: "Behind 🔥 #drama",
    channelName: "Velvet Romance",
    snippet: "Watch the complete AI-generated romance drama from Velvet Romance A cinematic love story...",
    isVerified: false
  },
  {
    title: "How The James Webb Telescope Changed Astronomy",
    channelName: "Veritasium",
    snippet: "We visit NASA to see how the mirrors were built and what new galaxy data shows.",
    isVerified: true
  },
  {
    title: "Stoicism as a Way of Life - Seneca, Epictetus, Marcus Aurelius",
    channelName: "Einzelgänger",
    snippet: "An introduction to the philosophy of Stoicism and its historical background.",
    isVerified: true
  },
  {
    title: "Episode 180 - The Philosophy of Artificial Intelligence",
    channelName: "Philosophize This!",
    snippet: "In this episode we discuss the emergence of intelligent systems from a philosophical lens.",
    isVerified: false
  },
  {
    title: "r/AITA for leaving my cheating wife with nothing after she brought her AP home?",
    channelName: "Reddit Stories Daily",
    snippet: "Voice generated using ElevenLabs. Best of Reddit updates and drama.",
    isVerified: false
  },
  {
    title: "Building an iOS App in Swift 2026 Tutorial",
    channelName: "Sean Allen",
    snippet: "Learn modern Swift development with SwiftUI in this complete guide.",
    isVerified: false
  },
  {
    title: "15 Minute Easy Pasta Recipe for Beginners",
    channelName: "Cooking With Jack",
    snippet: "A quick and delicious homemade dinner recipe anyone can make in 15 minutes.",
    isVerified: false
  }
];

// Warmup JIT
for (let i = 0; i < 500; i++) {
  const c = sampleCards[i % sampleCards.length];
  calculateScore(c, { sensitivityThreshold: 0.50 });
}

// Benchmark 5,000 Evaluations
const ITERATIONS = 5000;
const start = performance.now();

for (let i = 0; i < ITERATIONS; i++) {
  const card = sampleCards[i % sampleCards.length];
  calculateScore(card, { sensitivityThreshold: 0.50 });
}

const elapsedMs = performance.now() - start;
const avgMsPerCard = elapsedMs / ITERATIONS;
const avgUsPerCard = avgMsPerCard * 1000;
const evalsPerSec = Math.round(ITERATIONS / (elapsedMs / 1000));

console.log('\n⚡ 2. CPU EXECUTION TIME (SPEED & THROUGHPUT):');
console.log('   - Scope: scoring with the semantic model; excludes DOM extraction and rendering');
console.log(`   - Evaluated:               ${ITERATIONS.toLocaleString()} cards in batch`);
console.log(`   - Total Processing Time:   ${elapsedMs.toFixed(2)} ms`);
console.log(`   - Average Time per Card:   ${avgMsPerCard.toFixed(4)} ms (${avgUsPerCard.toFixed(1)} microseconds)`);
console.log(`   - Evaluation Throughput:   ${evalsPerSec.toLocaleString()} cards / second`);
console.log(`   - Budget per 60fps Frame:  16.6 ms`);
console.log(`   - Frame Cost per Card:     ${((avgMsPerCard / 16.6) * 100).toFixed(2)}% of one single frame`);

// 4. Heap change after the scoring batch (not a browser scroll simulation).
if (global.gc) global.gc();
const postMem = process.memoryUsage();
const leakMB = (postMem.heapUsed - loadedMem.heapUsed) / (1024 * 1024);

console.log('\n🔄 3. LEAK & SCROLL STABILITY:');
console.log(`   - Heap change after 5,000 cards: ${leakMB.toFixed(3)} MB${global.gc ? ' (after GC)' : ' (GC not forced)'}`);
console.log('   - Browser memory, idle CPU, and long-session leaks require a live-browser measurement.');

console.log('\n' + '='.repeat(65));
