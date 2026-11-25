const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const file of JSON.parse(fs.readFileSync('manifest.json', 'utf8')).content_scripts[0].js) {
  if (file.endsWith('/content.js') || file.endsWith('/thumbnailEngine.js')) continue;
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
}
sandbox.window.NoSlopCommunity.init([], JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8')).channels);

// Handwritten holdouts with unseen channel names; these measure regressions, not real-world accuracy.
const slop = [
  ['The poor kitten was mocked at school then became a superhero', 'An emotional animal story #aicat'],
  ['Baby monkey works in a restaurant to pay for mom\'s medicine', '#aimonkey #aivideos'],
  ['The homeless puppy rescued his family from a giant dinosaur', '#aianimals'],
  ['Tung Tung Sahur married Ballerina Cappuccina! Italian brainrot'],
  ['Cutting a glass watermelon with a glowing knife', 'AI ASMR satisfying video'],
  ['The Hidden City', 'Every frame was generated using Kling. Voiceover by ElevenLabs.'],
  ['Night Walk', 'Visuals: Midjourney. Narration: ElevenLabs.'],
  ['Mountain Sunset', 'Made with Veo 3.1. An AI short film.'],
  ['Lost in the Desert', 'Created using Hailuo AI and Runway Gen-4.'],
  ['I remade this pop song with a synthetic singer', '#aimusic #aicover'],
  ['Country ballads for a rainy evening', 'All songs generated with Suno AI.'],
  ['A Magical Forest', 'No camera was used; all visuals are AI-generated.'],
  ['AI-generated mini-drama', '', { isVerified: true }],
  ['My family kicked me out, unaware I was a secret heiress! Full mini drama'],
  ['Divorced by my billionaire husband, I returned with his triplets #shortdrama'],
  ['The CEO humiliated his contract wife then begged for mercy'],
  ['Dark psychology to make your ex addicted to you'],
  ['7 Stoic rules to make everyone fear and respect you'],
  ['Chosen ones: they are jealous of your divine power'],
  ['NASA Just Found Something So Terrifying It Changes Everything'],
  ['Voyager 1 Just Sent Back A Chilling Message That Scientists Cannot Explain'],
  ['Archaeologists Found A Forbidden Chamber That Rewrites History'],
  ['Reddit revenge: my entitled parents stole my inheritance', 'TTS narration over Minecraft parkour gameplay.'],
  ['My cheating husband regretted everything PART 3', 'Reddit story with AI narration.'],
  ['Earn $9,000 a month with faceless AI channels on autopilot'],
  ['Make $700 per day copying AI videos with ZERO work'],
  ['AVENGERS: SECRET WARS (2027) First Trailer', 'AI concept trailer, not an official release.'],
  ['A talk with a famous actor', 'This is a fictional AI interview using a cloned voice.'],
  ['Una gata salva a su familia', 'Este video fue generado con inteligencia artificial.'],
  ['Uma historia emocionante', 'Video criado com IA. Voz gerada por inteligencia artificial.'],
  ['Un monde imaginaire', 'Cette vidéo a été générée par intelligence artificielle.'],
  ['Eine wunderbare Welt', 'Dieses Video wurde mit künstlicher Intelligenz erstellt.'],
  ['एक अनोखी कहानी', 'यह वीडियो एआई से बनाया गया है।'],
  ['A\u200bI\u2011generated dream world'],
  ['An AІ generated fantasy adventure'],
  ['A cinematic future city #ＡＩｖｉｄｅｏ'],
  ['The orange kitten becomes a firefighter', '#catstory #aianimation'],
  ['A story', 'Visuals generated with Stable Diffusion, voice generated with ElevenLabs.']
];
const human = [
  ['James Webb measures the atmosphere of a distant planet', 'An astronomy lecturer reviews the published data.'],
  ['NASA detected a new radio signal. Here is the evidence.'],
  ['Scientists discover a new species in Antarctica'],
  ['Marcus Aurelius: 10 lessons in patience'],
  ['How to recognize dark psychology and avoid manipulation'],
  ['Carl Jung and the history of analytical psychology'],
  ['Why AI-generated video is a problem for science communication'],
  ['I tested 5 AI video generators so you do not have to', 'A review of Sora, Veo and Kling.'],
  ['How AI-generated animal rescue videos scam viewers'],
  ['AI voice cloning scams explained by a security researcher'],
  ['How to make an AI-generated video in Sora', 'A step-by-step tutorial recorded on my screen.'],
  ['Detecting AI-generated music with audio analysis'],
  ['The rise of #AI in medical research'],
  ['Suno vs Udio: comparing AI music tools'],
  ['The newest Runway collection at Paris fashion week'],
  ['Runway show: I created every dress by hand'],
  ['How the animators created Sora for Kingdom Hearts'],
  ['Sora fights the final boss | Kingdom Hearts 3'],
  ['Flux core welding tips for beginners'],
  ['Rescuing a kitten trapped in a drain', 'Real footage from our local shelter.'],
  ['Our puppy learning to climb stairs'],
  ['Baby monkey reunited with mother at a wildlife sanctuary'],
  ['Minecraft parkour challenge with friends'],
  ['Reading AITA live: my take on a difficult family argument'],
  ['Italian brainrot: explaining the meme to my dad'],
  ['Reacting to Tung Tung Sahur videos with my friends'],
  ['My hand-drawn cat animation', 'Pencil animation drawn frame by frame.'],
  ['This scene is from our fictional scripted drama', 'Written and performed by local actors.'],
  ['The mafia boss trope in romance novels', 'A critical review with the author.'],
  ['How romance scams promise love from fake billionaires'],
  ['This billionaire drama was filmed in my hometown', 'Behind the scenes with the cast and director.'],
  ['Original country song recorded live in my garage'],
  ['Rain sounds for sleep', 'I recorded this storm outside my window.'],
  ['ASUS ExpertBook P5 long term review'],
  ['Who is Al Pacino? An actor retrospective'],
  ['The truth about faceless YouTube passive income scams'],
  ['Why making $500 per day with ChatGPT is not realistic'],
  ['Video made without AI: a watercolor timelapse'],
  ['Not AI-generated. Filmed on a phone in my garden.'],
  ['A short film', 'We do not use AI-generated images or synthetic voices.'],
  ['How to spot a fake movie trailer', 'An investigation of AI concept trailers.'],
  ['A flower opening in my garden', 'A timelapse I captured with a camera.']
];

let missed = 0, falsePositives = 0;
for (const [expected, cases] of [[true, slop], [false, human]]) {
  for (const [title, snippet = '', extra = {}] of cases) {
    const meta = { title, snippet, channelName: 'Unseen creator', ...extra };
    const sensitivityThreshold = process.argv.includes('--aggressive') ? 0.35 : 0.50;
    const result = sandbox.window.NoSlopScoring.calculateScore(meta, { sensitivityThreshold });
    if (result.isBlocked !== expected) {
      if (expected) missed++; else falsePositives++;
      console.log(`${expected ? 'MISS' : 'FALSE POSITIVE'} ${result.score}: ${title} | ${result.reasons?.join(', ')}`);
    }
  }
}
console.log(JSON.stringify({ syntheticHoldout: true, slop: slop.length, human: human.length, missed, falsePositives }));
if (!process.argv.includes('--report-only')) {
  assert.equal(missed, 0, 'Slop regression cases must be caught');
  assert.equal(falsePositives, 0, 'Human controls must stay visible');
}
