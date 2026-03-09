import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, Clock, Zap, RefreshCcw, Heart, Sun, CloudRain, Flame, Scroll, Moon, ShieldAlert, GitCommit, Database } from 'lucide-react';

/**
 * UTILITIES
 */
const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
};

// Stages for Yggdrasil growth (thresholds in hours, exponential)
const STAGES = [
  { id: 0, name: 'Seed of Origin', threshold: 0 },
  { id: 1, name: 'Awakening Seed', threshold: 1 },
  { id: 2, name: 'Sprout of Realms', threshold: 3 },
  { id: 3, name: 'Roots of Wisdom', threshold: 8 },
  { id: 4, name: 'Trunk of Strength', threshold: 18 },
  { id: 5, name: 'Branches of Fate', threshold: 36 },
  { id: 6, name: 'Guardian of Worlds', threshold: 72 },
  { id: 7, name: 'Yggdrasil Ascendant', threshold: 144 },
];

// DYNAMIC PALETTES
const THEMES = {
    day: {
        sky: '#7dd3fc', // Sky 300 - Brighter
        skyGradient: '#e0f2fe', // Sky 100 - Very light
        mountain: '#64748b', // Slate 500 - Blueish Grey
        mountainHighlight: '#94a3b8', // Slate 400
        hillFar: '#4ade80', // Green 400 - Vibrant Green
        hillNear: '#16a34a', // Green 600 - Rich Green
        ground: '#15803d', // Green 700
        sunColor: '#facc15', // Yellow 400
        sunBorder: '#eab308', // Yellow 500
        starOpacity: 0
    },
    night: {
        sky: '#0f172a', // Slate 900
        skyGradient: '#1e1b4b', // Indigo 950
        mountain: '#312e81', // Indigo 900
        mountainHighlight: '#4338ca', // Indigo 700
        hillFar: '#1e3a8a', // Blue 900
        hillNear: '#064e3b', // Emerald 900
        ground: '#022c22', // Emerald 950
        sunColor: '#fef3c7', // Amber 100 (Moon)
        sunBorder: '#fde68a', // Amber 200
        starOpacity: 0.9
    },
    ragnarok: {
        sky: '#450a0a', // Red 950
        skyGradient: '#000000',
        mountain: '#1c1917', // Stone 900
        mountainHighlight: '#292524', // Stone 800
        hillFar: '#3f3f46', // Zinc 700
        hillNear: '#27272a', // Zinc 800
        ground: '#18181b', // Zinc 900
        sunColor: '#000000',
        sunBorder: '#7f1d1d', // Red 900
        starOpacity: 0
    }
};

const TREE_PALETTES = {
    lush: {
        wood: '#78350f', woodDark: '#451a03', woodLight: '#92400e', // Amber 900/950/800
        leaf: '#22c55e', leafDark: '#15803d', leafLight: '#4ade80', // Green 500/700/400
        magic: '#22d3ee', rune: '#fcd34d' // Cyan 400, Amber 300
    },
    withered: {
        wood: '#57534e', woodDark: '#292524', woodLight: '#78716c', // Stone colors
        leaf: '#eab308', leafDark: '#a16207', leafLight: '#fde047', // Yellow/Gold
        magic: '#fb923c', rune: '#fca5a5'
    },
    skeleton: {
        wood: '#a8a29e', woodDark: '#57534e', woodLight: '#d6d3d1', // Stone greys
        leaf: 'transparent', leafDark: 'transparent', leafLight: 'transparent',
        magic: '#94a3b8', rune: '#cbd5e1'
    },
    dead: {
        wood: '#171717', woodDark: '#000000', woodLight: '#262626', // Neutral 900
        leaf: '#171717', leafDark: '#000000', leafLight: '#262626',
        magic: '#ef4444', rune: '#dc2626'
    }
};

// Pixel Art Assets (SVG based)
const PixelArt = ({ stage, isDead, bounceTrigger, health, maxHealth }: { stage: number; isDead: boolean, bounceTrigger?: number, health: number, maxHealth: number }) => {
  const [isJumping, setIsJumping] = useState(false);
  
  // Calculate damage ratio for visual cracks (0 to 1, where 1 is full health)
  const hpRatio = health / maxHealth;
  const hpPercent = (health / maxHealth) * 100;
  
  // Determine Visual State based on HP rules
  let palette = TREE_PALETTES.lush;
  if (isDead) palette = TREE_PALETTES.dead;
  else if (hpPercent < 20) palette = TREE_PALETTES.skeleton;
  else if (hpPercent <= 80) palette = TREE_PALETTES.withered;

  const showMinorCracks = !isDead && hpPercent < 80;
  const showMajorCracks = !isDead && hpPercent < 40;
  const showFallenLeaves = !isDead && hpPercent < 40 && stage >= 2;

  useEffect(() => {
    if (bounceTrigger && bounceTrigger > 0) {
        setIsJumping(true);
        const t = setTimeout(() => setIsJumping(false), 500);
        return () => clearTimeout(t);
    }
  }, [bounceTrigger]);

  const animationClass = isDead 
    ? "animate-pulse grayscale opacity-90" 
    : isJumping 
        ? "animate-bounce-quick" 
        : stage === 0 || stage === 1 ? "animate-bounce-slow" : "animate-sway";

  // Palette Switching
  const cStem = palette.wood;
  const cStemD = palette.woodDark;
  const cStemL = palette.woodLight;
  
  const cLeaf = palette.leaf;
  const cLeafL = palette.leafLight;
  const cLeafD = palette.leafDark;
  
  const cMagic = palette.magic;

  // Cracks Overlay Component
  const DamageOverlay = () => (
      <g className="opacity-80">
          {showMinorCracks && (
              <path d="M30 50 L32 54 L30 58" stroke="#3e2723" strokeWidth="1" fill="none" />
          )}
          {showMajorCracks && (
              <>
                <path d="M34 45 L32 48 L35 50" stroke="#3e2723" strokeWidth="1" fill="none" />
                <path d="M28 42 L30 46" stroke="#3e2723" strokeWidth="1" fill="none" />
                <rect x="25" y="35" width="2" height="2" fill="#3e2723" />
              </>
          )}
      </g>
  );

  const FallenLeaves = () => {
    const c1 = '#fbc02d'; // Yellow
    const c2 = '#f57f17'; // Orange
    const c3 = '#8d6e63'; // Brown
    
    return (
      <g className="animate-pulse">
          <rect x="18" y="60" width="2" height="1" fill={c3} />
          <rect x="22" y="62" width="3" height="2" fill={c1} />
          <rect x="28" y="61" width="2" height="2" fill={c2} />
          <rect x="36" y="62" width="3" height="2" fill={c1} />
          <rect x="42" y="60" width="2" height="1" fill={c2} />
          <rect x="46" y="62" width="2" height="2" fill={c3} />
          {hpPercent < 20 && (
             <>
               <rect x="15" y="63" width="2" height="1" fill={c1} />
               <rect x="32" y="63" width="2" height="1" fill={c2} />
               <rect x="50" y="61" width="2" height="1" fill={c3} />
               <rect x="25" y="64" width="2" height="1" fill={c3} />
             </>
          )}
      </g>
    );
  };

  if (isDead) {
    return (
      <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art drop-shadow-2xl ${animationClass}`}>
        {/* Broken Trunk */}
        <path d="M24 64 L26 50 L38 50 L40 64 Z" fill={cStemD} />
        <path d="M26 50 L24 40 L30 46 L34 40 L40 50 Z" fill={cStem} />
        {/* Fire/Embers */}
        <rect x="28" y="48" width="2" height="2" fill="#ff3d00" className="animate-pulse" />
        <rect x="34" y="44" width="2" height="2" fill="#ff3d00" className="animate-pulse" />
        {/* Fallen Branches */}
        <path d="M10 60 L20 62 L18 58 Z" fill={cStemD} />
      </svg>
    );
  }

  // Animation helper classes
  const leafAnim = !isDead ? "animate-rustle-1" : "";
  const leafAnimDelayed = !isDead ? "animate-rustle-2" : "";
  const magicAnim = !isDead ? "animate-magic" : "";

  switch (stage) {
    case 0: // Seed of Origin
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          {/* Soil Mound - Grounded look */}
          <path d="M22 64 L26 60 L38 60 L42 64 Z" fill={cStemD} />
          
          {/* Natural Seed (Acorn) */}
          <rect x="29" y="53" width="6" height="7" rx="2" fill={cStem} />
          <rect x="28" y="52" width="8" height="3" rx="1" fill={cStemD} />
          <rect x="31" y="50" width="2" height="2" fill={cStemD} />

          {/* Subtle Highlight */}
          <rect x="30" y="55" width="2" height="2" fill={cStemL} opacity="0.6" />
        </svg>
      );
    case 1: // Awakening Seed
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          {/* Soil Mound */}
          <path d="M22 64 L26 60 L38 60 L42 64 Z" fill={cStemD} />
          
          {/* Acorn Base */}
          <rect x="29" y="53" width="6" height="7" rx="2" fill={cStem} />
          <rect x="28" y="52" width="8" height="3" rx="1" fill={cStemD} />
          <rect x="31" y="50" width="2" height="2" fill={cStemD} />
          
          {/* Sprout Stem */}
          <rect x="31" y="46" width="2" height="4" fill={cLeaf} />
          
          {/* Leaves */}
          <g className={leafAnim}>
            <rect x="29" y="44" width="2" height="2" fill={cLeaf} />
            <rect x="33" y="44" width="2" height="2" fill={cLeaf} />
            <rect x="31" y="42" width="2" height="2" fill={cLeafL} />
          </g>

          {/* Sparkle */}
          <rect x="36" y="42" width="1" height="1" fill={cMagic} className={magicAnim} opacity="0.6" />
        </svg>
      );
    case 2: // Sprout of Realms
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <rect x="30" y="48" width="4" height="12" fill={cStem} />
          <rect x="30" y="48" width="1" height="12" fill={cStemL} opacity="0.3" />
          <rect x="32" y="52" width="1" height="2" fill={cStemD} opacity="0.3" />
          <DamageOverlay />
          {showFallenLeaves && <FallenLeaves />}
          
          <g className={leafAnim}>
            <path d="M30 48 h-6 v-4 h2 v-2 h4 v2 h4 v4 h-4 z" fill={cLeaf} />
            <rect x="26" y="44" width="2" height="2" fill={cLeafL} />
            <rect x="36" y="44" width="2" height="2" fill={cLeafD} />
            <rect x="30" y="42" width="4" height="2" fill={cLeafL} opacity="0.5" />
          </g>
          
          <rect x="28" y="44" width="2" height="2" fill={cMagic} opacity="0.7" className={magicAnim} />
          <rect x="34" y="44" width="2" height="2" fill={cMagic} opacity="0.7" className={magicAnim} />
        </svg>
      );
    case 3: // Roots of Wisdom
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <rect x="28" y="40" width="8" height="20" fill={cStem} />
          {/* Shading */}
          <rect x="34" y="40" width="2" height="20" fill={cStemD} opacity="0.3" />
          <rect x="28" y="40" width="2" height="20" fill={cStemL} opacity="0.2" />
          <rect x="30" y="44" width="2" height="2" fill={cStemD} opacity="0.3" />
          <rect x="32" y="50" width="2" height="2" fill={cStemD} opacity="0.3" />
          
          <DamageOverlay />
          {showFallenLeaves && <FallenLeaves />}
          <path d="M28 60 L24 64 H28 L30 60 Z" fill={cStemD} />
          <path d="M36 60 L40 64 H36 L34 60 Z" fill={cStemD} />
          
          <g className={leafAnim}>
            <rect x="20" y="32" width="24" height="12" fill={cLeaf} />
            <rect x="24" y="28" width="16" height="4" fill={cLeafL} />
            {/* Leaf Detail */}
            <rect x="22" y="34" width="2" height="2" fill={cLeafD} opacity="0.5" />
            <rect x="38" y="38" width="2" height="2" fill={cLeafD} opacity="0.5" />
            <rect x="26" y="30" width="2" height="2" fill={cLeaf} opacity="0.5" />
            <rect x="36" y="30" width="2" height="2" fill={cLeaf} opacity="0.5" />
            <rect x="30" y="36" width="4" height="2" fill={cLeafD} opacity="0.3" />
          </g>
          
          <rect x="30" y="34" width="4" height="4" fill={cMagic} className={magicAnim} />
        </svg>
      );
    case 4: // Trunk of Strength
    case 5: // Branches of Fate
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <path d="M26 64 L28 40 L36 40 L38 64 Z" fill={cStem} />
          {/* Trunk Texture */}
          <rect x="34" y="40" width="2" height="24" fill={cStemD} opacity="0.3" />
          <rect x="28" y="40" width="2" height="24" fill={cStemL} opacity="0.2" />
          <rect x="30" y="44" width="2" height="2" fill={cStemD} opacity="0.4" />
          <rect x="32" y="52" width="2" height="2" fill={cStemD} opacity="0.4" />
          <rect x="30" y="58" width="2" height="2" fill={cStemD} opacity="0.4" />
          
          <DamageOverlay />
          {showFallenLeaves && <FallenLeaves />}
          <path d="M28 44 L16 36 L18 34 L28 42 Z" fill={cStem} />
          <path d="M36 44 L48 36 L46 34 L36 42 Z" fill={cStem} />
          
          <g className={leafAnim}>
            <circle cx="16" cy="34" r="8" fill={cLeaf} />
            <circle cx="14" cy="32" r="2" fill={cLeafL} />
            <circle cx="18" cy="36" r="2" fill={cLeafD} />
            {/* Extra Leaf Detail */}
            <circle cx="12" cy="36" r="1" fill={cLeafD} opacity="0.5" />
            <circle cx="20" cy="32" r="1" fill={cLeafL} opacity="0.5" />
          </g>
          <g className={leafAnimDelayed}>
             <circle cx="48" cy="34" r="8" fill={cLeaf} />
             <circle cx="50" cy="36" r="2" fill={cLeafD} />
             <circle cx="46" cy="32" r="2" fill={cLeafL} />
             {/* Extra Leaf Detail */}
             <circle cx="52" cy="32" r="1" fill={cLeafL} opacity="0.5" />
             <circle cx="44" cy="36" r="1" fill={cLeafD} opacity="0.5" />
          </g>
          <g className={leafAnim}>
            <circle cx="32" cy="24" r="14" fill={cLeafD} />
            <circle cx="32" cy="22" r="10" fill={cLeaf} />
            <circle cx="36" cy="18" r="3" fill={cLeafL} />
            <circle cx="28" cy="26" r="3" fill={cLeafD} opacity="0.5" />
            {/* Extra Leaf Detail */}
            <circle cx="38" cy="24" r="2" fill={cLeafD} opacity="0.3" />
            <circle cx="26" cy="20" r="2" fill={cLeafL} opacity="0.3" />
            <circle cx="32" cy="16" r="2" fill={cLeafL} opacity="0.5" />
          </g>
          
          <rect x="14" y="32" width="4" height="4" fill={palette.rune} className={magicAnim} />
          <rect x="46" y="32" width="4" height="4" fill={cMagic} className={magicAnim} />
        </svg>
      );
    case 6: // Guardian of Worlds
    case 7: // Yggdrasil Ascendant
    default:
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <path d="M22 64 L26 30 L38 30 L42 64 Z" fill={cStem} />
          <path d="M22 64 L16 64 L24 50 Z" fill={cStemD} />
          <path d="M42 64 L48 64 L40 50 Z" fill={cStemD} />
          
          {/* Trunk Shading & Texture */}
          <rect x="36" y="30" width="4" height="34" fill={cStemD} opacity="0.3" />
          <rect x="26" y="30" width="2" height="34" fill={cStemL} opacity="0.2" />
          <rect x="30" y="34" width="2" height="4" fill={cStemD} opacity="0.4" />
          <rect x="32" y="44" width="2" height="4" fill={cStemD} opacity="0.4" />
          <rect x="28" y="54" width="2" height="4" fill={cStemD} opacity="0.4" />
          <rect x="34" y="58" width="2" height="2" fill={cStemD} opacity="0.4" />
          
          <DamageOverlay />
          {showFallenLeaves && <FallenLeaves />}
          <path d="M26 36 L10 20 L14 18 L28 32 Z" fill={cStem} />
          <path d="M38 36 L54 20 L50 18 L36 32 Z" fill={cStem} />
          <rect x="30" y="10" width="4" height="20" fill={cStem} />
          
          <g className={leafAnim}>
            <rect x="4" y="14" width="16" height="12" fill={cLeafD} />
            <rect x="6" y="10" width="12" height="4" fill={cLeaf} />
            <rect x="8" y="16" width="4" height="4" fill={cLeaf} opacity="0.5" />
            <rect x="14" y="12" width="2" height="2" fill={cLeafL} />
            {/* Extra Detail */}
            <rect x="2" y="18" width="2" height="2" fill={cLeafD} opacity="0.6" />
            <rect x="18" y="12" width="2" height="2" fill={cLeafL} opacity="0.6" />
          </g>
          
          <g className={leafAnimDelayed}>
            <rect x="44" y="14" width="16" height="12" fill={cLeafD} />
            <rect x="46" y="10" width="12" height="4" fill={cLeaf} />
            <rect x="52" y="18" width="4" height="4" fill={cLeaf} opacity="0.5" />
            <rect x="48" y="12" width="2" height="2" fill={cLeafL} />
            {/* Extra Detail */}
            <rect x="60" y="18" width="2" height="2" fill={cLeafD} opacity="0.6" />
            <rect x="44" y="12" width="2" height="2" fill={cLeafL} opacity="0.6" />
          </g>

          <g className={leafAnim} style={{ animationDuration: '6s' }}>
             <rect x="20" y="0" width="24" height="16" fill={cLeaf} />
             <rect x="24" y="-4" width="16" height="4" fill={cLeafL} />
             <rect x="22" y="4" width="4" height="4" fill={cLeafD} opacity="0.3" />
             <rect x="38" y="2" width="4" height="4" fill={cLeafL} opacity="0.3" />
             <rect x="30" y="-2" width="4" height="4" fill={cLeafL} />
             {/* Extra Detail */}
             <rect x="18" y="4" width="2" height="4" fill={cLeafD} opacity="0.4" />
             <rect x="44" y="4" width="2" height="4" fill={cLeafD} opacity="0.4" />
             <rect x="32" y="12" width="4" height="2" fill={cLeafD} opacity="0.4" />
          </g>

          <circle cx="12" cy="20" r="2" fill={cMagic} className={magicAnim} />
          <circle cx="52" cy="20" r="2" fill={palette.rune} className={magicAnim} style={{animationDelay: '1s'}} />
          <circle cx="32" cy="8" r="3" fill="#e1bee7" className={magicAnim} style={{animationDelay: '0.5s'}} />
          <path d="M24 60 L20 64 M40 60 L44 64" stroke={cStemD} strokeWidth="2" />
        </svg>
      );
  }
};

const PixelRain = ({ isFire, color }: { isFire?: boolean, color?: string }) => {
    const fillColor = isFire ? "%23ff3d00" : (color ? color.replace('#', '%23') : "%23B3E5FC");
    const fillColorMid = isFire ? "%23ff3d00" : (color ? color.replace('#', '%23') : "%2381D4FA");

    const bgBack = `data:image/svg+xml,%3Csvg width='50' height='50' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='0' width='2' height='4' fill='${fillColor}' /%3E%3Crect x='35' y='25' width='2' height='4' fill='${fillColor}' /%3E%3C/svg%3E`;
    const bgMid = `data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='5' y='0' width='2' height='8' fill='${fillColorMid}' /%3E%3Crect x='25' y='20' width='2' height='8' fill='${fillColorMid}' /%3E%3C/svg%3E`;

    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-90">
            <div className="absolute -inset-full w-[300%] h-[300%] animate-rain-slow opacity-40" 
                 style={{ backgroundImage: `url("${bgBack}")`, transform: 'skewX(-5deg)' }}></div>
            <div className="absolute -inset-full w-[300%] h-[300%] animate-rain-medium opacity-60" 
                 style={{ backgroundImage: `url("${bgMid}")`, transform: 'skewX(-5deg)' }}></div>
        </div>
    );
};

const Clouds = ({ themeMode }: { themeMode: 'day' | 'night' }) => {
    if (themeMode === 'night') return null;
    
    // Helper for a single granular cloud
    const GranularCloud = ({ x, y, scale = 1, speed = 20 }: { x: number, y: number, scale?: number, speed?: number }) => (
        <g transform={`translate(${x}, ${y}) scale(${scale})`} className="animate-cloud-drift" style={{ animationDuration: `${speed}s` }}>
            {/* Main Body (White) */}
            <rect x="4" y="2" width="10" height="2" fill="#ffffff" />
            <rect x="2" y="4" width="14" height="2" fill="#ffffff" />
            <rect x="0" y="6" width="18" height="2" fill="#ffffff" />
            
            {/* Shadow/Shading (Light Blue) */}
            <rect x="2" y="8" width="14" height="1" fill="#e1f5fe" />
            <rect x="4" y="6" width="2" height="2" fill="#e1f5fe" opacity="0.5" />
            <rect x="12" y="6" width="2" height="2" fill="#e1f5fe" opacity="0.5" />
        </g>
    );

    return (
        <g className="opacity-90">
            <GranularCloud x={10} y={15} scale={1.2} speed={25} />
            <GranularCloud x={60} y={8} scale={0.8} speed={35} />
            <GranularCloud x={110} y={20} scale={1} speed={20} />
            <GranularCloud x={140} y={12} scale={0.6} speed={40} />
        </g>
    );
};

// Ratatoskr (Squirrel) - Now silent
const Ratatoskr = ({ isDead, onInteract }: { isDead: boolean, onInteract: (x: number, y: number) => void }) => {
    const [offsetY, setOffsetY] = useState(0);
    const [direction, setDirection] = useState(1); 
    
    if (isDead) return null;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setOffsetY(-30);
        setDirection(prev => prev * -1);
        onInteract(30, 70);
        setTimeout(() => setOffsetY(0), 300);
    };

    return (
        <div 
            onClick={handleClick}
            className="absolute bottom-[11%] left-[15%] w-10 h-10 cursor-pointer z-20 transition-transform duration-300"
            style={{ 
                transform: `translateY(${offsetY}px) scaleX(${direction})`,
            }}
        >
             <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-lg">
                {/* Tail */}
                <rect x="1" y="4" width="3" height="3" fill="#5d4037" />
                <rect x="2" y="7" width="3" height="3" fill="#5d4037" />
                <rect x="3" y="2" width="2" height="2" fill="#795548" />
                
                {/* Body */}
                <rect x="5" y="6" width="5" height="5" fill="#8d6e63" />
                <rect x="6" y="11" width="1" height="1" fill="#5d4037" /> {/* Leg */}
                <rect x="9" y="11" width="1" height="1" fill="#5d4037" /> {/* Leg */}

                {/* Head */}
                <rect x="9" y="3" width="4" height="4" fill="#8d6e63" />
                <rect x="9" y="2" width="1" height="1" fill="#5d4037" /> {/* Ear */}
                <rect x="12" y="2" width="1" height="1" fill="#5d4037" /> {/* Ear */}
                
                {/* Face */}
                <rect x="11" y="4" width="1" height="1" fill="#000" /> {/* Eye */}
                <rect x="12" y="5" width="1" height="1" fill="#3e2723" /> {/* Nose */}
             </svg>
        </div>
    );
};

const Fireflies = () => {
    // Generate random positions and delays
    const fireflies = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 60 + 20, // Keep them somewhat centered vertically
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 6 // Slower duration (6-12s)
    }));
  
    return (
      <div className="absolute inset-0 pointer-events-none z-20">
        {fireflies.map(f => (
          <div
            key={f.id}
            className="absolute w-1 h-1 bg-yellow-200 rounded-full animate-firefly opacity-0 shadow-[0_0_4px_rgba(253,224,71,0.8)]"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`
            }}
          />
        ))}
      </div>
    );
  };

const Bird = ({ themeMode }: { themeMode: 'day' | 'night' }) => {
    if (themeMode === 'night') return null;
    return (
        <div className="absolute top-10 -left-10 animate-fly-across z-10 w-4 h-3 opacity-80">
             <svg viewBox="0 0 8 6" className="w-full h-full">
                 <rect x="0" y="2" width="2" height="1" fill="#000" />
                 <rect x="2" y="3" width="2" height="1" fill="#000" />
                 <rect x="4" y="2" width="2" height="1" fill="#000" />
                 <rect x="2" y="1" width="1" height="1" fill="#000" className="animate-wing-flap" />
                 <rect x="5" y="1" width="1" height="1" fill="#000" className="animate-wing-flap" />
             </svg>
        </div>
    );
}

const FallingLeaves = ({ themeMode }: { themeMode: 'day' | 'night' }) => {
    const leaves = Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 5 + Math.random() * 5
    }));

    const color = themeMode === 'day' ? 'bg-green-400' : 'bg-emerald-700';

    return (
        <div className="absolute inset-0 pointer-events-none z-20">
            {leaves.map(l => (
                <div
                    key={l.id}
                    className={`absolute w-1 h-1 ${color} rounded-sm animate-leaf-fall opacity-0`}
                    style={{
                        left: `${l.left}%`,
                        top: '-5%',
                        animationDelay: `${l.delay}s`,
                        animationDuration: `${l.duration}s`
                    }}
                />
            ))}
        </div>
    );
};

const PixelLandscape = ({ isDead, weather, onInteract, themeMode }: { isDead: boolean, weather: 'sunny' | 'rainy', onInteract: (x: number, y: number, text?: string) => void, themeMode: 'day' | 'night' }) => {
    const isRainy = !isDead && weather === 'rainy';
    
    let currentTheme = THEMES[themeMode];
    if (isDead) currentTheme = THEMES.ragnarok;

    const showRain = isRainy && !isDead;
    const showEmbers = isDead;

    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
             {/* Sky Gradient */}
             <div className="absolute inset-0 transition-colors duration-1000" 
                  style={{ background: `linear-gradient(to bottom, ${currentTheme.sky}, ${currentTheme.skyGradient})` }} />

             {/* Stars */}
             {!isDead && (
                <div className="absolute inset-0 transition-opacity duration-1000" 
                     style={{
                         opacity: currentTheme.starOpacity,
                         backgroundImage: 'radial-gradient(white 1px, transparent 1px)', 
                         backgroundSize: '50px 50px'
                     }}></div>
             )}

             {/* Sun / Moon */}
             {!isDead && !isRainy && (
                 <div 
                    onClick={(e) => { e.stopPropagation(); onInteract(90, 10, themeMode === 'day' ? "SUN!" : "MOON"); }}
                    className={`absolute top-6 right-8 w-16 h-16 rounded-full border-4 shadow-[0_0_40px_rgba(255,255,200,0.3)] transition-all duration-1000 cursor-pointer hover:scale-110 flex items-center justify-center`} 
                    style={{ backgroundColor: currentTheme.sunColor, borderColor: currentTheme.sunBorder }}
                 >
                     {/* Icon for day/night */}
                     <span className="opacity-20 text-yellow-900">
                         {themeMode === 'day' ? <Sun size={32} /> : <Moon size={32} />}
                     </span>
                 </div>
             )}

             {/* Ragnarok Sun */}
             {isDead && (
                 <div className="absolute top-6 right-8 w-16 h-16 rounded-full border-4 bg-black border-red-900 shadow-[0_0_50px_rgba(255,0,0,0.8)] animate-pulse" />
             )}

             <Ratatoskr isDead={isDead} onInteract={(x, y) => onInteract(x, y)} />
             
             {/* Ambient Creatures */}
             {!isDead && !isRainy && <Bird themeMode={themeMode} />}
             {!isDead && themeMode === 'night' && <Fireflies />}
             {!isDead && !isRainy && <FallingLeaves themeMode={themeMode} />}

             {showRain && <PixelRain color={themeMode === 'day' ? '#29b6f6' : undefined} />}
             {showEmbers && <PixelRain isFire={true} />}

             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 100" shapeRendering="crispEdges">
                 {/* Clouds */}
                 {!isDead && !isRainy && <Clouds themeMode={themeMode} />}

                 {/* Mountain (High Granularity) */}
                 <path d="M0 100 V 60 H 4 V 56 H 8 V 52 H 12 V 48 H 16 V 44 H 20 V 40 H 24 V 36 H 28 V 32 H 32 V 28 H 36 V 24 H 40 V 28 H 44 V 32 H 48 V 36 H 52 V 40 H 56 V 44 H 60 V 48 H 64 V 44 H 68 V 40 H 72 V 36 H 76 V 32 H 80 V 28 H 84 V 24 H 88 V 20 H 92 V 24 H 96 V 28 H 100 V 32 H 104 V 36 H 108 V 40 H 112 V 44 H 116 V 48 H 120 V 52 H 124 V 56 H 128 V 60 H 132 V 64 H 136 V 68 H 140 V 72 H 144 V 76 H 148 V 80 H 152 V 84 H 156 V 88 H 160 V 100 Z" 
                       fill={currentTheme.mountain} className="transition-colors duration-1000" />
                 
                 {/* Mountain Shading/Texture */}
                 {!isDead && (
                    <g fill={currentTheme.mountainHighlight} opacity="0.3">
                        <rect x="20" y="44" width="2" height="2" />
                        <rect x="24" y="40" width="2" height="4" />
                        <rect x="40" y="32" width="2" height="2" />
                        <rect x="44" y="36" width="2" height="2" />
                        <rect x="60" y="52" width="2" height="2" />
                        <rect x="80" y="32" width="2" height="2" />
                        <rect x="88" y="24" width="2" height="4" />
                        <rect x="96" y="32" width="2" height="2" />
                        <rect x="120" y="56" width="2" height="2" />
                        <rect x="140" y="76" width="2" height="2" />
                        {/* Darker spots */}
                        <rect x="16" y="48" width="2" height="2" fill="#000" opacity="0.2" />
                        <rect x="56" y="48" width="2" height="2" fill="#000" opacity="0.2" />
                        <rect x="92" y="28" width="2" height="2" fill="#000" opacity="0.2" />
                        <rect x="128" y="64" width="2" height="2" fill="#000" opacity="0.2" />
                    </g>
                 )}

                 {/* Snow Caps (Detail) */}
                 {!isDead && (
                    <g fill="#ffffff" opacity="0.9">
                        <rect x="34" y="24" width="4" height="2" />
                        <rect x="32" y="26" width="8" height="2" />
                        <rect x="36" y="28" width="2" height="2" />
                        
                        <rect x="86" y="20" width="4" height="2" />
                        <rect x="84" y="22" width="8" height="2" />
                        <rect x="82" y="24" width="12" height="2" />
                        <rect x="88" y="26" width="4" height="2" opacity="0.5" />
                    </g>
                 )}

                 {/* Hill Far (Granular) */}
                 <path d="M0 100 V 80 H 4 V 78 H 8 V 76 H 12 V 74 H 16 V 72 H 20 V 70 H 24 V 68 H 28 V 66 H 32 V 64 H 36 V 62 H 40 V 64 H 44 V 66 H 48 V 68 H 52 V 70 H 56 V 72 H 60 V 74 H 64 V 72 H 68 V 70 H 72 V 68 H 76 V 66 H 80 V 64 H 84 V 62 H 88 V 60 H 92 V 62 H 96 V 64 H 100 V 66 H 104 V 68 H 108 V 70 H 112 V 72 H 116 V 74 H 120 V 76 H 124 V 78 H 128 V 80 H 132 V 78 H 136 V 76 H 140 V 74 H 144 V 72 H 148 V 74 H 152 V 76 H 156 V 78 H 160 V 100 Z" 
                       fill={currentTheme.hillFar} className="transition-colors duration-1000" />
                 
                 {/* Hill Near (Granular) */}
                 <path d="M0 100 V 92 H 4 V 90 H 8 V 88 H 12 V 86 H 16 V 84 H 20 V 82 H 24 V 80 H 28 V 82 H 32 V 84 H 36 V 86 H 40 V 88 H 44 V 90 H 48 V 88 H 52 V 86 H 56 V 84 H 60 V 82 H 64 V 80 H 68 V 78 H 72 V 80 H 76 V 82 H 80 V 84 H 84 V 86 H 88 V 88 H 92 V 90 H 96 V 88 H 100 V 86 H 104 V 84 H 108 V 82 H 112 V 80 H 116 V 82 H 120 V 84 H 124 V 86 H 128 V 88 H 132 V 90 H 136 V 92 H 140 V 90 H 144 V 88 H 148 V 86 H 152 V 88 H 156 V 90 H 160 V 100 Z" 
                       fill={currentTheme.hillNear} className="transition-colors duration-1000" />
                 
                 {/* Texture / Detail Pixels */}
                 {!isDead && (
                    <g opacity="0.4">
                        {/* Far Hill Texture */}
                        <rect x="20" y="74" width="2" height="2" fill="#14532d" />
                        <rect x="45" y="70" width="2" height="2" fill="#14532d" />
                        <rect x="90" y="66" width="2" height="2" fill="#14532d" />
                        <rect x="130" y="76" width="2" height="2" fill="#14532d" />
                        <rect x="70" y="68" width="2" height="2" fill="#14532d" />
                        <rect x="110" y="72" width="2" height="2" fill="#14532d" />
                        {/* Highlights */}
                        <rect x="22" y="72" width="2" height="2" fill="#86efac" opacity="0.3" />
                        <rect x="92" y="64" width="2" height="2" fill="#86efac" opacity="0.3" />

                        {/* Near Hill Texture */}
                        <rect x="10" y="94" width="2" height="2" fill="#064e3b" />
                        <rect x="60" y="86" width="2" height="2" fill="#064e3b" />
                        <rect x="110" y="84" width="2" height="2" fill="#064e3b" />
                        <rect x="150" y="92" width="2" height="2" fill="#064e3b" />
                        <rect x="30" y="88" width="2" height="2" fill="#064e3b" />
                        <rect x="80" y="90" width="2" height="2" fill="#064e3b" />
                        <rect x="130" y="88" width="2" height="2" fill="#064e3b" />
                        {/* Highlights */}
                        <rect x="62" y="84" width="2" height="2" fill="#4ade80" opacity="0.2" />
                        <rect x="112" y="82" width="2" height="2" fill="#4ade80" opacity="0.2" />
                    </g>
                 )}

                 {/* Ground */}
                 <rect x="0" y="96" width="160" height="4" fill={currentTheme.ground} className="transition-colors duration-1000" />
                 
                 {/* Ground Detail (Grass/Stones) */}
                 {!isDead && (
                    <g>
                        {/* Grass Tufts */}
                        <g className="animate-sway origin-bottom" style={{ animationDuration: '3s' }}>
                            <rect x="10" y="95" width="1" height="2" fill="#4caf50" />
                            <rect x="12" y="94" width="1" height="3" fill="#4caf50" />
                            <rect x="14" y="95" width="1" height="2" fill="#4caf50" />
                        </g>

                        <g className="animate-sway origin-bottom" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                            <rect x="50" y="95" width="1" height="2" fill="#4caf50" />
                            <rect x="52" y="94" width="1" height="3" fill="#4caf50" />
                        </g>
                        
                        <g className="animate-sway origin-bottom" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                            <rect x="120" y="95" width="1" height="2" fill="#4caf50" />
                            <rect x="122" y="94" width="1" height="3" fill="#4caf50" />
                            <rect x="124" y="95" width="1" height="2" fill="#4caf50" />
                        </g>

                        {/* Stones */}
                        <rect x="30" y="97" width="3" height="2" fill="#78909c" />
                        <rect x="31" y="96" width="1" height="1" fill="#cfd8dc" />
                        
                        <rect x="90" y="97" width="2" height="2" fill="#78909c" />
                        
                        <rect x="140" y="97" width="4" height="2" fill="#78909c" />
                        <rect x="141" y="96" width="2" height="1" fill="#cfd8dc" />
                    </g>
                 )}
             </svg>
             
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(black 1px, transparent 0)', backgroundSize: '4px 4px' }} />
        </div>
    );
};

const SlackNotification = ({ message, visible }: { message: string, visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border-2 border-red-500/50 flex items-start gap-3 max-w-sm font-sans">
        <div className="bg-red-900/50 p-2 rounded-full animate-pulse border border-red-500">
            <Flame size={20} className="text-red-400" />
        </div>
        <div>
            <div className="font-bold text-xs uppercase tracking-wider mb-1 text-red-400 font-pixel">Alert Received</div>
            <div className="text-sm shadow-black drop-shadow-md font-rpg tracking-wide">{message}</div>
        </div>
      </div>
    </div>
  );
};

const PixelRune = () => {
    const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ'];
    const r = runes[Math.floor(Math.random() * runes.length)];
    return (
        <div className="text-yellow-300 font-pixel text-lg animate-float-up shadow-glow">{r}</div>
    );
}

const PixelSparkle = () => (
    <div className="w-4 h-4 bg-cyan-300 rotate-45 animate-spin shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
);

function App() {
  const [lastIncident, setLastIncident] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isLocalDev);
  const [incidentMessage, setIncidentMessage] = useState<string | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [weather, setWeather] = useState<'sunny' | 'rainy'>('sunny');
  const [themeMode, setThemeMode] = useState<'day' | 'night'>('day');

  // Health System
  const [health, setHealth] = useState(100);
  const [liveMaxHp, setLiveMaxHp] = useState<number | null>(null);
  const [eventLog, setEventLog] = useState<{timestamp: string; message: string; hp_before: number; hp_after: number; url?: string}[]>([]);
  const [visualEffects, setVisualEffects] = useState<{id: number; type: 'sparkle' | 'rune' | 'milestone'; x: number; y: number; content?: string}[]>([]);
  const [bounceTrigger, setBounceTrigger] = useState(0);

  const prevProgressRef = useRef(0);
  const prevStageRef = useRef(0);
  const isFirstRender = useRef(true);

  // Time Logic
  useEffect(() => {
    const saved = localStorage.getItem('last_incident_timestamp');
    if (saved) setLastIncident(parseInt(saved, 10));
    
    const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now.getTime());
        
        // Day/Night Cycle (6am to 6pm is Day)
        if (!isDemoMode) {
            const hour = now.getHours();
            setThemeMode(hour >= 6 && hour < 18 ? 'day' : 'night');
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Poll for external state (Simulation of GitHub Action / Backend update)
  useEffect(() => {
      if (isDemoMode) return;

      const fetchData = async () => {
          try {
              const res = await fetch('./data/state.json');
              if (res.ok) {
                  const data = await res.json();
                  if (data.current_hp !== undefined) setHealth(data.current_hp);
                  if (data.max_hp !== undefined) setLiveMaxHp(data.max_hp);
                  if (data.last_activity_timestamp) setLastIncident(new Date(data.last_activity_timestamp).getTime());
                  if (data.status === 'dead') setIsDead(true);
                  if (data.status === 'healthy') setIsDead(false);

                  if (Array.isArray(data.event_log)) {
                      setEventLog(data.event_log);
                  }
              }
          } catch (e) {
              console.log("Could not fetch state.json (Live mode active but file not found or CORS)");
          }
      };

      // Poll every 60s
      fetchData();
      const poll = setInterval(fetchData, 60000);
      return () => clearInterval(poll);
  }, [isDemoMode]);

  const diff = Math.max(0, currentTime - lastIncident);
  const timeUnit = isDemoMode ? TIME_UNITS.SECOND : TIME_UNITS.HOUR;
  const unitsPassed = Math.floor(diff / timeUnit);

  let currentStageIndex = STAGES.findIndex((s) => unitsPassed < s.threshold) - 1;
  if (currentStageIndex === -2) currentStageIndex = STAGES.length - 1;
  if (currentStageIndex < 0) currentStageIndex = 0;

  const currentStage = STAGES[currentStageIndex];
  const maxHealth = (!isDemoMode && liveMaxHp) ? liveMaxHp : (currentStageIndex + 1) * 50 + 50;

  // Healing Logic (Only in Demo Mode - Live mode expects backend to update HP)
  useEffect(() => {
      if (isDead || !isDemoMode) return;
      
      const healInterval = 1000;
      const healAmount = 5;

      const i = setInterval(() => {
          setHealth(prev => Math.min(prev + healAmount, maxHealth));
      }, healInterval);
      return () => clearInterval(i);
  }, [isDead, maxHealth, isDemoMode]);

  // Ensure HP doesn't exceed max when leveling up
  useEffect(() => {
      setHealth(prev => Math.min(prev, maxHealth));
  }, [maxHealth]);

  const handleDamage = (amount: number, reason: string) => {
    setIncidentMessage(reason);
    
    setHealth(prev => {
        const newHealth = prev - amount;
        if (newHealth <= 0) {
            triggerRagnarok();
            return 0;
        }
        return newHealth;
    });
    setTimeout(() => setIncidentMessage(null), 4000);
  };

  const handleHeal = (amount: number, reason: string) => {
      if (isDead) {
          // Resurrection commit!
          setIsDead(false);
          setHealth(50);
          setIncidentMessage("RESURRECTION: Core Systems Online");
      } else {
          setHealth(prev => Math.min(prev + amount, maxHealth));
          setIncidentMessage(reason);
      }
      setTimeout(() => setIncidentMessage(null), 4000);
  };

  const triggerRagnarok = () => {
      const now = Date.now();
      setLastIncident(now);
      localStorage.setItem('last_incident_timestamp', now.toString());
      setIsDead(true);
      setIncidentMessage("CRITICAL FAILURE: RAGNARÖK INITIATED");
      setTimeout(() => setIncidentMessage(null), 8000);
      // In demo mode, we reset automatically. In Real mode, it stays dead until fixed.
      if (isDemoMode) {
        setTimeout(() => setIsDead(false), 8000);
        setTimeout(() => setHealth(100), 8000);
      }
  };

  const resetToCleanSlate = () => {
    const now = Date.now();
    setLastIncident(now);
    localStorage.setItem('last_incident_timestamp', now.toString());
    setIsDead(false);
    setHealth(100);
    setIncidentMessage(null);
  };

  let progress = 0;
  let cyclesRemaining = 0;
  const isMaxLevel = currentStageIndex >= STAGES.length - 1;
  if (!isMaxLevel) {
      const currentThreshold = currentStage.threshold;
      const nextThreshold = STAGES[currentStageIndex + 1].threshold;
      progress = ((unitsPassed - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
      cyclesRemaining = nextThreshold - unitsPassed;
  } else {
      progress = 100;
  }

  // Visual Effects Spawner
  const spawnEffect = (type: 'sparkle' | 'rune' | 'milestone', text?: string, xPos?: number, yPos?: number) => {
    const id = Date.now() + Math.random();
    const x = xPos !== undefined ? xPos : 40 + Math.random() * 20;
    const y = yPos !== undefined ? yPos : 40 + Math.random() * 20;
    setVisualEffects(prev => [...prev, { id, type, x, y, content: text }]);
    setTimeout(() => setVisualEffects(prev => prev.filter(e => e.id !== id)), 2000);
  };

  useEffect(() => {
      if (isFirstRender.current) {
          isFirstRender.current = false;
          prevProgressRef.current = progress;
          prevStageRef.current = currentStageIndex;
          setHealth(maxHealth); // Start with full health
          return;
      }
      const prevP = prevProgressRef.current;
      const currP = progress;
      
      // Milestone effects
      if (currentStageIndex > prevStageRef.current) {
          for(let i=0; i<5; i++) spawnEffect('sparkle');
          spawnEffect('rune');
          spawnEffect('milestone', 'LEVEL UP!');
          setBounceTrigger(n => n + 1);
          setHealth(maxHealth); // Heal on level up
      }

      prevProgressRef.current = currP;
      prevStageRef.current = currentStageIndex;
  }, [progress, currentStageIndex, maxHealth]);

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center overflow-hidden relative selection:bg-purple-500 selection:text-white">
      
      {/* Outer Wallpaper Pattern */}
      <div className="absolute inset-0 opacity-5"
           style={{
             backgroundImage: `radial-gradient(#a78bfa 1px, transparent 1px)`,
             backgroundSize: '32px 32px'
           }}
      />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Cinzel:wght@400;700&display=swap');
        
        .font-pixel { font-family: 'Press Start 2P', cursive; }
        .font-rpg { font-family: 'VT323', monospace; }
        .font-mythic { font-family: 'Cinzel', serif; }
        
        .pixel-art { shape-rendering: crispEdges; }
        
        .animate-bounce-slow { animation: bounce 3s infinite; }
        .animate-bounce-quick { animation: bounce 0.5s ease-in-out; }
        .animate-sway { animation: sway 5s ease-in-out infinite; }
        .animate-float-up { animation: float-up 2s ease-out forwards; }
        
        /* New Natural Animations */
        @keyframes rustle-1 {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            25% { transform: rotate(1deg) translateY(0.5px); }
            75% { transform: rotate(-1deg) translateY(-0.5px); }
        }
        @keyframes rustle-2 {
            0%, 100% { transform: rotate(0deg) scale(1); }
            33% { transform: rotate(-1deg) scale(1.02); }
            66% { transform: rotate(1deg) scale(0.98); }
        }
        @keyframes magic-pulse {
            0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px currentColor); }
            50% { opacity: 1; filter: drop-shadow(0 0 5px currentColor); }
        }
        .animate-rustle-1 { animation: rustle-1 3s ease-in-out infinite; transform-box: fill-box; transform-origin: bottom center; }
        .animate-rustle-2 { animation: rustle-2 4s ease-in-out infinite reverse; transform-box: fill-box; transform-origin: center; }
        .animate-magic { animation: magic-pulse 2s ease-in-out infinite; }

        @keyframes rain-fall {
            0% { background-position: 0 0; }
            100% { background-position: 0 400px; }
        }
        .animate-rain-slow { animation: rain-fall 1s linear infinite; }
        .animate-rain-medium { animation: rain-fall 0.5s linear infinite; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }
        @keyframes cloud-drift {
            0% { transform: translateX(0); }
            50% { transform: translateX(5px); }
            100% { transform: translateX(0); }
        }
        .animate-cloud-drift { animation: cloud-drift 20s ease-in-out infinite; }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes float-up {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
            100% { transform: translateY(-60px) scale(1); opacity: 0; }
        }

        @keyframes firefly {
          0% { opacity: 0; transform: translate(0, 0); }
          20% { opacity: 1; }
          50% { transform: translate(10px, -10px); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-5px, -20px); }
        }
        .animate-firefly { animation: firefly linear infinite; }

        @keyframes fly-across {
            0% { transform: translateX(-20px) translateY(0); }
            25% { transform: translateX(25vw) translateY(10px); }
            50% { transform: translateX(50vw) translateY(-5px); }
            75% { transform: translateX(75vw) translateY(5px); }
            100% { transform: translateX(110vw) translateY(0); }
        }
        .animate-fly-across { animation: fly-across 20s linear infinite; }

        @keyframes wing-flap {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        .animate-wing-flap { animation: wing-flap 0.2s steps(1) infinite; }

        @keyframes leaf-fall {
            0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateY(110vh) rotate(360deg) translateX(20px); opacity: 0; }
        }
        .animate-leaf-fall { animation: leaf-fall linear infinite; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e1b4b; }
        ::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 4px; }

        .shadow-glow { text-shadow: 0 0 10px rgba(253, 224, 71, 0.8); }

        .btn-mythic {
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
        }
        .btn-mythic:active { transform: scale(0.95); }
        .btn-mythic::after {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: 0.5s;
        }
        .btn-mythic:hover::after { left: 100%; }
      `}</style>

      <SlackNotification message={incidentMessage || ""} visible={!!incidentMessage} />

      <div className="z-10 w-full max-w-3xl px-4 flex flex-col items-center gap-6">

        {/* Header Badge */}
        <div className="bg-slate-900 text-purple-200 px-6 py-3 border-y-2 border-purple-500/30 rounded-lg shadow-2xl flex flex-col items-center">
            <h1 className="font-mythic text-xl md:text-2xl tracking-[0.2em] text-center text-purple-100 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                YggdraLizy
            </h1>
            <div className="flex gap-2 text-[10px] uppercase tracking-widest text-purple-400/60 font-pixel mt-1">
                <span>SDLC Monitor</span>
                <span>•</span>
                <span className={isDemoMode ? "text-cyan-400" : "text-green-400"}>
                    {isDemoMode ? "DEMO MODE" : "LIVE MODE"}
                </span>
            </div>
        </div>

        {/* Game Scene Container */}
        <div className="w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden flex flex-col relative border-[6px] border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-800 ring-1 ring-slate-600 transition-colors duration-1000">
            
            <PixelLandscape isDead={isDead} weather={weather} onInteract={(x, y, t) => spawnEffect(t ? 'milestone' : 'rune', t, x, y)} themeMode={themeMode} />

            {/* HUD */}
            <div className="absolute top-4 left-4 right-4 grid grid-cols-3 items-start z-20 pointer-events-none gap-2">
                
                {/* Left: Health Bar */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-600 p-2 rounded shadow-lg justify-self-start min-w-[120px]">
                    <div className="flex items-center gap-2 font-pixel text-[10px] text-slate-200 mb-1">
                        <Heart size={12} className="text-red-500 fill-red-500" />
                        <span>INTEGRITY</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 border border-slate-600 rounded overflow-hidden relative">
                         <div 
                            className={`h-full transition-all duration-300 ${isDead ? 'bg-red-900' : 'bg-red-500'}`} 
                            style={{ width: `${(health / maxHealth) * 100}%` }} 
                         />
                    </div>
                    <div className="text-[9px] text-right text-slate-400 mt-1 font-mono">{Math.floor(health)} / {maxHealth}</div>
                </div>
                
                {/* Center: Stage Name */}
                <div className="bg-slate-900/70 text-purple-100 px-3 py-2 rounded-full font-mythic text-xs md:text-sm tracking-[0.1em] backdrop-blur-md border border-purple-500/30 shadow-lg text-center whitespace-nowrap justify-self-center self-center animate-float-up">
                    {currentStage.name}
                </div>
                
                {/* Right: Progress */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-600 p-2 rounded shadow-lg text-right justify-self-end min-w-[120px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-pixel text-[10px] text-purple-200 tracking-wider">
                            LVL {currentStageIndex + 1}
                        </span>
                        <span className="font-pixel text-[10px] text-cyan-300">
                            {isMaxLevel ? 'MAX' : `${Math.floor(progress)}%`}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 border border-slate-600 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-purple-900/50"></div>
                        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.8)]" style={{ width: `${progress}%` }} />
                    </div>
                    {!isMaxLevel && (
                        <div className="text-[9px] text-slate-400 mt-1 font-mono">
                            {isDemoMode ? `${cyclesRemaining} cycles left` : `~${cyclesRemaining}h to next`}
                        </div>
                    )}
                </div>
            </div>

            {/* World Content */}
            <div className="flex-1 relative flex items-center justify-center z-10 pointer-events-none">
                
                {visualEffects.map(effect => (
                     <div 
                        key={effect.id} 
                        className="absolute z-30 animate-float-up flex flex-col items-center"
                        style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
                     >
                        {effect.type === 'rune' && <PixelRune />}
                        {effect.type === 'sparkle' && <PixelSparkle />}
                        {effect.type === 'milestone' && (
                            <div className="text-amber-900 font-pixel text-[10px] whitespace-nowrap bg-amber-100 px-2 py-1 rounded border-2 border-amber-500 shadow-lg scale-90">
                                {effect.content}
                            </div>
                        )}
                     </div>
                 ))}

                <div className="absolute bottom-[10%] z-10 pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-500" 
                     onClick={() => spawnEffect('rune', undefined, 50, 60)}>
                     <PixelArt stage={currentStage.id} isDead={isDead} bounceTrigger={bounceTrigger} health={health} maxHealth={maxHealth} />
                </div>
            </div>

        </div>

        {/* Controls */}
        <div className="bg-slate-800 border-2 border-slate-600 w-full p-6 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
             <div className="absolute top-2 left-2 text-slate-700 font-pixel text-xs opacity-50">ᚠ</div>
             <div className="absolute bottom-2 right-2 text-slate-700 font-pixel text-xs opacity-50">ᛟ</div>
            
            <div className="flex flex-col items-center md:items-start z-10 min-w-[150px]">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1 font-pixel">Cycle Duration</div>
                <div className="font-rpg text-5xl text-purple-100 leading-none drop-shadow-md">
                    {isDemoMode ? (
                        <span>{unitsPassed} <span className="text-2xl text-purple-400">CYCLES</span></span>
                    ) : (
                        <span className="tabular-nums">{days}d {hours}h {minutes}m</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 z-10 flex-wrap justify-center">
                
                {/* Mode Toggle (local dev only) */}
                {isLocalDev && (
                  <button
                    onClick={() => setIsDemoMode(!isDemoMode)}
                    className={`btn-mythic border-b-4 rounded p-3 flex items-center gap-2 font-pixel text-[10px] mr-2 ${isDemoMode ? 'bg-purple-600 border-purple-800 text-white' : 'bg-green-700 border-green-900 text-green-100'}`}
                    title="Toggle Simulation vs Real Data"
                  >
                      {isDemoMode ? <Zap size={16} /> : <Database size={16} />}
                      <span className="hidden md:inline">{isDemoMode ? 'DEMO MODE' : 'LIVE DATA'}</span>
                  </button>
                )}

                {/* Simulation Controls (Only visible in Demo Mode) */}
                {isDemoMode && (
                    <>
                        <button 
                          onClick={() => setThemeMode(m => m === 'day' ? 'night' : 'day')}
                          className="btn-mythic bg-indigo-600 hover:bg-indigo-500 text-white border-b-4 border-indigo-900 rounded p-3 shadow-lg flex items-center gap-1"
                          title="Toggle Day/Night"
                        >
                            {themeMode === 'day' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>

                        <button 
                          onClick={() => handleDamage(10, "CI Pipeline Failure (-10 HP)")}
                          className="btn-mythic bg-red-600 hover:bg-red-500 text-white border-b-4 border-red-900 rounded p-3 shadow-lg flex items-center gap-1"
                          title="Simulate CI Failure"
                        >
                            <AlertTriangle size={16} />
                            <span className="font-pixel text-[8px]">-10</span>
                        </button>
                        
                        <button 
                          onClick={() => handleDamage(5, "Dependabot Alert (-5 HP)")}
                          className="btn-mythic bg-orange-600 hover:bg-orange-500 text-white border-b-4 border-orange-900 rounded p-3 shadow-lg flex items-center gap-1"
                          title="Simulate Security Alert"
                        >
                            <ShieldAlert size={16} />
                            <span className="font-pixel text-[8px]">-5</span>
                        </button>

                        <button 
                          onClick={() => handleHeal(15, "Hotfix Merged (+15 HP)")}
                          className="btn-mythic bg-emerald-600 hover:bg-emerald-500 text-white border-b-4 border-emerald-900 rounded p-3 shadow-lg flex items-center gap-1"
                          title="Simulate Fix"
                        >
                            <GitCommit size={16} />
                            <span className="font-pixel text-[8px]">+15</span>
                        </button>

                        <button 
                          onClick={resetToCleanSlate}
                          className="btn-mythic bg-amber-600 hover:bg-amber-500 text-white border-b-4 border-amber-800 rounded p-3 shadow-lg"
                          title="Hard Reset"
                        >
                            <RefreshCcw size={16} />
                        </button>
                    </>
                )}
                
                {/* Shared Utils */}
                <button 
                  onClick={() => setWeather(w => w === 'sunny' ? 'rainy' : 'sunny')}
                  className={`btn-mythic border-b-4 rounded p-3 flex items-center gap-2 font-pixel text-[10px] ${weather === 'sunny' ? 'bg-cyan-700 border-cyan-900 text-cyan-100' : 'bg-slate-600 border-slate-800 text-slate-300'}`}
                  title="Alter Weather"
                >
                    {weather === 'sunny' ? <Sun size={16} /> : <CloudRain size={16} />}
                </button>
            </div>
        </div>

        {/* Event Log (Live mode only) */}
        {!isDemoMode && eventLog.length > 0 && (
          <div className="bg-slate-800 border-2 border-slate-600 w-full p-4 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Scroll size={14} className="text-purple-400" />
              <span className="font-pixel text-[10px] text-purple-400 uppercase tracking-widest">Chronicle</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
              {[...eventLog].reverse().map((entry, i) => {
                const date = new Date(entry.timestamp);
                const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const hpDiff = entry.hp_after - entry.hp_before;
                const hpColor = hpDiff > 0 ? 'text-emerald-400' : hpDiff < 0 ? 'text-red-400' : 'text-slate-400';
                const hpSign = hpDiff > 0 ? '+' : '';
                return (
                  <div key={i} className={`flex items-start gap-3 py-2 ${i < eventLog.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                    <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{timeStr}</span>
                    <span className="font-rpg text-sm text-slate-300 flex-1 leading-tight">
                      {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-300 underline decoration-slate-600 hover:decoration-purple-400 transition-colors">
                          {entry.message}
                        </a>
                      ) : entry.message}
                    </span>
                    <span className={`font-pixel text-[10px] whitespace-nowrap mt-0.5 ${hpColor}`}>
                      {hpSign}{hpDiff} HP
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                      {entry.hp_after}/{liveMaxHp ?? 100}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);