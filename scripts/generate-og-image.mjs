import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '..', 'public', 'data', 'state.json');
const OUTPUT_DIR = resolve(__dirname, '..', 'dist');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'og-image.png');

const STAGES = [
  { name: 'Seed of Origin', threshold: 0 },
  { name: 'Awakening Seed', threshold: 1 },
  { name: 'Sprout of Realms', threshold: 3 },
  { name: 'Roots of Wisdom', threshold: 8 },
  { name: 'Trunk of Strength', threshold: 18 },
  { name: 'Branches of Fate', threshold: 36 },
  { name: 'Guardian of Worlds', threshold: 72 },
  { name: 'Yggdrasil Ascendant', threshold: 144 },
];

const HOUR_MS = 60 * 60 * 1000;

const PALETTES = {
  lush: { wood: '#78350f', woodDark: '#451a03', leaf: '#22c55e', leafDark: '#15803d', leafLight: '#4ade80', magic: '#22d3ee' },
  withered: { wood: '#57534e', woodDark: '#292524', leaf: '#eab308', leafDark: '#a16207', leafLight: '#fde047', magic: '#fb923c' },
  skeleton: { wood: '#a8a29e', woodDark: '#57534e', leaf: 'transparent', leafDark: 'transparent', leafLight: 'transparent', magic: '#94a3b8' },
  dead: { wood: '#171717', woodDark: '#000000', leaf: '#171717', leafDark: '#000000', leafLight: '#262626', magic: '#ef4444' },
};

function getStageIndex(days) {
  let idx = STAGES.findIndex(s => days < s.threshold) - 1;
  if (idx === -2) idx = STAGES.length - 1;
  if (idx < 0) idx = 0;
  return idx;
}

function getPalette(hpPercent, isDead) {
  if (isDead) return PALETTES.dead;
  if (hpPercent < 20) return PALETTES.skeleton;
  if (hpPercent <= 80) return PALETTES.withered;
  return PALETTES.lush;
}

function renderTree(stage, palette, isDead) {
  const { wood, woodDark, leaf, leafDark, leafLight, magic } = palette;

  if (isDead) {
    return `
      <path d="M24 64 L26 50 L38 50 L40 64 Z" fill="${woodDark}" />
      <path d="M26 50 L24 40 L30 46 L34 40 L40 50 Z" fill="${wood}" />
      <rect x="28" y="48" width="2" height="2" fill="#ff3d00" />
      <rect x="34" y="44" width="2" height="2" fill="#ff3d00" />
      <path d="M10 60 L20 62 L18 58 Z" fill="${woodDark}" />
    `;
  }

  switch (stage) {
    case 0:
      return `
        <path d="M22 64 L26 60 L38 60 L42 64 Z" fill="${woodDark}" />
        <rect x="29" y="53" width="6" height="7" rx="2" fill="${wood}" />
        <rect x="28" y="52" width="8" height="3" rx="1" fill="${woodDark}" />
        <rect x="31" y="50" width="2" height="2" fill="${woodDark}" />
      `;
    case 1:
      return `
        <path d="M22 64 L26 60 L38 60 L42 64 Z" fill="${woodDark}" />
        <rect x="29" y="53" width="6" height="7" rx="2" fill="${wood}" />
        <rect x="28" y="52" width="8" height="3" rx="1" fill="${woodDark}" />
        <rect x="31" y="50" width="2" height="2" fill="${woodDark}" />
        <rect x="31" y="46" width="2" height="4" fill="${leaf}" />
        <rect x="29" y="44" width="2" height="2" fill="${leaf}" />
        <rect x="33" y="44" width="2" height="2" fill="${leaf}" />
        <rect x="31" y="42" width="2" height="2" fill="${leafLight}" />
        <rect x="36" y="42" width="1" height="1" fill="${magic}" opacity="0.6" />
      `;
    case 2:
      return `
        <rect x="30" y="48" width="4" height="12" fill="${wood}" />
        <path d="M30 48 h-6 v-4 h2 v-2 h4 v2 h4 v4 h-4 z" fill="${leaf}" />
        <rect x="26" y="44" width="2" height="2" fill="${leafLight}" />
        <rect x="36" y="44" width="2" height="2" fill="${leafDark}" />
        <rect x="28" y="44" width="2" height="2" fill="${magic}" opacity="0.7" />
        <rect x="34" y="44" width="2" height="2" fill="${magic}" opacity="0.7" />
      `;
    case 3:
      return `
        <rect x="28" y="40" width="8" height="20" fill="${wood}" />
        <path d="M28 60 L24 64 H28 L30 60 Z" fill="${woodDark}" />
        <path d="M36 60 L40 64 H36 L34 60 Z" fill="${woodDark}" />
        <rect x="20" y="32" width="24" height="12" fill="${leaf}" />
        <rect x="24" y="28" width="16" height="4" fill="${leafLight}" />
        <rect x="22" y="34" width="2" height="2" fill="${leafDark}" opacity="0.5" />
        <rect x="38" y="38" width="2" height="2" fill="${leafDark}" opacity="0.5" />
        <rect x="30" y="34" width="4" height="4" fill="${magic}" />
      `;
    case 4:
    case 5:
      return `
        <path d="M26 64 L28 40 L36 40 L38 64 Z" fill="${wood}" />
        <rect x="34" y="40" width="2" height="24" fill="${woodDark}" opacity="0.3" />
        <path d="M28 44 L16 36 L18 34 L28 42 Z" fill="${wood}" />
        <path d="M36 44 L48 36 L46 34 L36 42 Z" fill="${wood}" />
        <circle cx="16" cy="34" r="8" fill="${leaf}" />
        <circle cx="14" cy="32" r="2" fill="${leafLight}" />
        <circle cx="48" cy="34" r="8" fill="${leaf}" />
        <circle cx="46" cy="32" r="2" fill="${leafLight}" />
        <circle cx="32" cy="24" r="14" fill="${leafDark}" />
        <circle cx="32" cy="22" r="10" fill="${leaf}" />
        <circle cx="36" cy="18" r="3" fill="${leafLight}" />
        <rect x="14" y="32" width="4" height="4" fill="${magic}" />
        <rect x="46" y="32" width="4" height="4" fill="${magic}" />
      `;
    case 6:
    case 7:
    default:
      return `
        <path d="M22 64 L26 30 L38 30 L42 64 Z" fill="${wood}" />
        <path d="M22 64 L16 64 L24 50 Z" fill="${woodDark}" />
        <path d="M42 64 L48 64 L40 50 Z" fill="${woodDark}" />
        <rect x="36" y="30" width="4" height="34" fill="${woodDark}" opacity="0.3" />
        <path d="M26 36 L10 20 L14 18 L28 32 Z" fill="${wood}" />
        <path d="M38 36 L54 20 L50 18 L36 32 Z" fill="${wood}" />
        <rect x="30" y="10" width="4" height="20" fill="${wood}" />
        <rect x="4" y="14" width="16" height="12" fill="${leafDark}" />
        <rect x="6" y="10" width="12" height="4" fill="${leaf}" />
        <rect x="14" y="12" width="2" height="2" fill="${leafLight}" />
        <rect x="44" y="14" width="16" height="12" fill="${leafDark}" />
        <rect x="46" y="10" width="12" height="4" fill="${leaf}" />
        <rect x="48" y="12" width="2" height="2" fill="${leafLight}" />
        <rect x="20" y="0" width="24" height="16" fill="${leaf}" />
        <rect x="24" y="-4" width="16" height="4" fill="${leafLight}" />
        <rect x="30" y="-2" width="4" height="4" fill="${leafLight}" />
        <circle cx="12" cy="20" r="2" fill="${magic}" />
        <circle cx="52" cy="20" r="2" fill="${magic}" />
        <circle cx="32" cy="8" r="3" fill="#e1bee7" />
        <path d="M24 60 L20 64 M40 60 L44 64" stroke="${woodDark}" stroke-width="2" fill="none" />
      `;
  }
}

function hpBarSvg(hp, max, x, y, width, height) {
  const pct = hp / max;
  const filledW = Math.round(pct * width);
  let color = '#22c55e';
  if (pct <= 0.2) color = '#6b7280';
  else if (pct <= 0.5) color = '#ef4444';
  else if (pct <= 0.8) color = '#eab308';

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" fill="#1e1e2e" stroke="#3f3f46" stroke-width="1" />
    <rect x="${x + 1}" y="${y + 1}" width="${Math.max(0, filledW - 2)}" height="${height - 2}" rx="3" fill="${color}" />
  `;
}

function generateOgSvg(state) {
  const hp = state.current_hp ?? 100;
  const maxHp = state.max_hp ?? 100;
  const isDead = state.status === 'dead';
  const hpPercent = (hp / maxHp) * 100;

  const now = new Date();
  const activityTs = state.last_activity_timestamp ? new Date(state.last_activity_timestamp).getTime() : now.getTime();
  const hoursPassed = Math.floor((now.getTime() - activityTs) / HOUR_MS);
  const stageIdx = getStageIndex(hoursPassed);
  const stageName = STAGES[stageIdx].name;

  const palette = getPalette(hpPercent, isDead);

  const statusText = isDead ? 'RAGNAROK' : (hpPercent > 80 ? 'Thriving' : hpPercent > 40 ? 'Withering' : 'Critical');
  const statusColor = isDead ? '#ef4444' : (hpPercent > 80 ? '#22c55e' : hpPercent > 40 ? '#eab308' : '#ef4444');

  // Background gradient based on health
  const bgTop = isDead ? '#1a0000' : '#0f172a';
  const bgBottom = isDead ? '#0a0000' : '#1e1b4b';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgTop}" />
      <stop offset="100%" stop-color="${bgBottom}" />
    </linearGradient>
    <style>
      text { font-family: monospace, 'Courier New', Courier; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Ground -->
  <rect x="0" y="520" width="1200" height="110" fill="${isDead ? '#1a0505' : '#15803d'}" />
  <rect x="0" y="520" width="1200" height="4" fill="${isDead ? '#2d0a0a' : '#22c55e'}" opacity="0.3" />

  <!-- Stars (if not dead) -->
  ${!isDead ? `
    <circle cx="100" cy="80" r="1.5" fill="white" opacity="0.6" />
    <circle cx="300" cy="120" r="1" fill="white" opacity="0.4" />
    <circle cx="900" cy="60" r="1.5" fill="white" opacity="0.5" />
    <circle cx="1050" cy="140" r="1" fill="white" opacity="0.3" />
    <circle cx="750" cy="90" r="1.5" fill="white" opacity="0.4" />
    <circle cx="550" cy="50" r="1" fill="white" opacity="0.5" />
  ` : ''}

  <!-- Tree (scaled up, centered) -->
  <g transform="translate(200, 140) scale(5.5)" shape-rendering="crispEdges">
    ${renderTree(stageIdx, palette, isDead)}
  </g>

  <!-- Title -->
  <text x="680" y="120" fill="white" font-size="52" font-weight="bold" text-anchor="start">YggdraLizy</text>

  <!-- Status badge -->
  <rect x="680" y="140" width="${statusText.length * 16 + 24}" height="36" rx="6" fill="${statusColor}" opacity="0.2" />
  <text x="692" y="165" fill="${statusColor}" font-size="22" font-weight="bold">${statusText}</text>

  <!-- Stage -->
  <text x="680" y="220" fill="#a1a1aa" font-size="20">Stage ${stageIdx + 1}</text>
  <text x="680" y="250" fill="#e4e4e7" font-size="28" font-weight="bold">${stageName}</text>

  <!-- HP Bar -->
  <text x="680" y="310" fill="#a1a1aa" font-size="18">HP</text>
  <text x="${680 + 340}" y="310" fill="#e4e4e7" font-size="18" text-anchor="end">${hp} / ${maxHp}</text>
  ${hpBarSvg(hp, maxHp, 680, 320, 340, 24)}

  <!-- Last event -->
  <text x="680" y="400" fill="#71717a" font-size="16">Last event</text>
  <text x="680" y="425" fill="#a1a1aa" font-size="16">${escapeXml(state.last_update_message || 'No recent events')}</text>

  <!-- Footer -->
  <text x="680" y="560" fill="#52525b" font-size="14">Dynamic SDLC Health Visualizer</text>
</svg>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function main() {
  let state;
  try {
    state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    console.warn('No state.json found, using defaults');
    state = { current_hp: 100, max_hp: 100, status: 'healthy', last_update_message: 'System operational' };
  }

  const svg = generateOgSvg(state);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, pngBuffer);
  console.log(`OG image generated: ${OUTPUT_PATH} (${pngBuffer.length} bytes)`);
}

main();
