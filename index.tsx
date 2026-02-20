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

// Stages for Yggdrasil growth
const STAGES = [
  { id: 0, name: 'Seed of Origin', threshold: 0 },
  { id: 1, name: 'Sprout of Realms', threshold: 10 },
  { id: 2, name: 'Roots of Wisdom', threshold: 25 },
  { id: 3, name: 'Trunk of Strength', threshold: 45 },
  { id: 4, name: 'Branches of Fate', threshold: 70 },
  { id: 5, name: 'Guardian of Worlds', threshold: 100 },
  { id: 6, name: 'Yggdrasil Ascendant', threshold: 140 },
];

// DYNAMIC PALETTES
const THEMES = {
    day: {
        sky: '#4fc3f7',
        skyGradient: '#e1f5fe',
        mountain: '#7986cb',
        mountainHighlight: '#9fa8da',
        hillFar: '#66bb6a',
        hillNear: '#43a047',
        ground: '#2e7d32',
        sunColor: '#fdd835',
        sunBorder: '#fbc02d',
        starOpacity: 0
    },
    night: {
        sky: '#1a1b4b',
        skyGradient: '#000000',
        mountain: '#4527a0',
        mountainHighlight: '#5e35b1',
        hillFar: '#311b92',
        hillNear: '#004d40',
        ground: '#1b5e20',
        sunColor: '#fff9c4', // Moon color
        sunBorder: '#fff59d',
        starOpacity: 0.6
    },
    ragnarok: {
        sky: '#370617',
        skyGradient: '#000000',
        mountain: '#212121',
        mountainHighlight: '#424242',
        hillFar: '#3e2723',
        hillNear: '#4e342e',
        ground: '#3e2723',
        sunColor: '#000000',
        sunBorder: '#b71c1c',
        starOpacity: 0
    }
};

const TREE_PALETTES = {
    lush: {
        wood: '#795548', woodDark: '#4e342e', woodLight: '#a1887f',
        leaf: '#4caf50', leafDark: '#2e7d32', leafLight: '#81c784',
        magic: '#00e5ff', rune: '#ffd700'
    },
    withered: {
        wood: '#6d4c41', woodDark: '#3e2723', woodLight: '#8d6e63',
        leaf: '#fbc02d', leafDark: '#f57f17', leafLight: '#fff176', // Autumn/Sick Yellow
        magic: '#ffab91', rune: '#ffeb3b'
    },
    skeleton: {
        wood: '#9e9e9e', woodDark: '#616161', woodLight: '#bdbdbd', // Grey/Ash
        leaf: 'transparent', leafDark: 'transparent', leafLight: 'transparent', // No leaves
        magic: '#b0bec5', rune: '#cfd8dc'
    },
    dead: {
        wood: '#212121', woodDark: '#000000', woodLight: '#424242',
        leaf: '#212121', leafDark: '#000000', leafLight: '#424242',
        magic: '#ff3d00', rune: '#ff3d00'
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
        : stage === 0 ? "animate-bounce-slow" : "animate-sway";

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

  switch (stage) {
    case 0: // Seed of Origin
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <rect x="28" y="52" width="8" height="8" rx="1" fill={cStemD} />
          <rect x="30" y="54" width="4" height="4" fill={palette.rune} className="animate-pulse" />
          <path d="M32 52 v-4" stroke={cMagic} strokeWidth="2" strokeDasharray="2 1" />
        </svg>
      );
    case 1: // Sprout of Realms
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <rect x="30" y="48" width="4" height="12" fill={cStem} />
          <DamageOverlay />
          <path d="M30 48 h-6 v-4 h2 v-2 h4 v2 h4 v4 h-4 z" fill={cLeaf} />
          <rect x="28" y="44" width="2" height="2" fill={cMagic} opacity="0.7" />
          <rect x="34" y="44" width="2" height="2" fill={cMagic} opacity="0.7" />
        </svg>
      );
    case 2: // Roots of Wisdom
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <rect x="28" y="40" width="8" height="20" fill={cStem} />
          <rect x="30" y="40" width="4" height="20" fill={cStemL} opacity="0.2" />
          <DamageOverlay />
          <path d="M28 60 L24 64 H28 L30 60 Z" fill={cStemD} />
          <path d="M36 60 L40 64 H36 L34 60 Z" fill={cStemD} />
          <rect x="20" y="32" width="24" height="12" fill={cLeaf} />
          <rect x="24" y="28" width="16" height="4" fill={cLeafL} />
          <rect x="30" y="34" width="4" height="4" fill={cMagic} className="animate-pulse" />
        </svg>
      );
    case 3: // Trunk of Strength
    case 4: // Branches of Fate
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <path d="M26 64 L28 40 L36 40 L38 64 Z" fill={cStem} />
          <rect x="30" y="40" width="4" height="24" fill={cStemL} opacity="0.2" />
          <DamageOverlay />
          <path d="M28 44 L16 36 L18 34 L28 42 Z" fill={cStem} />
          <path d="M36 44 L48 36 L46 34 L36 42 Z" fill={cStem} />
          <circle cx="16" cy="34" r="8" fill={cLeaf} />
          <circle cx="48" cy="34" r="8" fill={cLeaf} />
          <circle cx="32" cy="24" r="14" fill={cLeafD} />
          <circle cx="32" cy="22" r="10" fill={cLeaf} />
          <rect x="14" y="32" width="4" height="4" fill={palette.rune} />
          <rect x="46" y="32" width="4" height="4" fill={cMagic} />
        </svg>
      );
    case 5: // Guardian of Worlds
    case 6: // Yggdrasil Ascendant
    default:
      return (
        <svg viewBox="0 0 64 64" className={`w-64 h-64 pixel-art ${animationClass}`}>
          <path d="M22 64 L26 30 L38 30 L42 64 Z" fill={cStem} />
          <path d="M22 64 L16 64 L24 50 Z" fill={cStemD} />
          <path d="M42 64 L48 64 L40 50 Z" fill={cStemD} />
          <DamageOverlay />
          <path d="M26 36 L10 20 L14 18 L28 32 Z" fill={cStem} />
          <path d="M38 36 L54 20 L50 18 L36 32 Z" fill={cStem} />
          <rect x="30" y="10" width="4" height="20" fill={cStem} />
          <rect x="4" y="14" width="16" height="12" fill={cLeafD} />
          <rect x="6" y="10" width="12" height="4" fill={cLeaf} />
          <rect x="44" y="14" width="16" height="12" fill={cLeafD} />
          <rect x="46" y="10" width="12" height="4" fill={cLeaf} />
          <rect x="20" y="0" width="24" height="16" fill={cLeaf} />
          <rect x="24" y="-4" width="16" height="4" fill={cLeafL} />
          <circle cx="12" cy="20" r="2" fill={cMagic} className="animate-pulse" />
          <circle cx="52" cy="20" r="2" fill={palette.rune} className="animate-pulse" style={{animationDelay: '1s'}} />
          <circle cx="32" cy="8" r="3" fill="#e1bee7" className="animate-pulse" style={{animationDelay: '0.5s'}} />
          <path d="M24 60 L20 64 M40 60 L44 64" stroke={cStemD} strokeWidth="2" />
        </svg>
      );
  }
};

const PixelRain = ({ isFire, color }: { isFire?: boolean, color?: string }) => (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden opacity-90">
        <svg className="absolute inset-0 w-full h-[200%] -top-full animate-rain-slow opacity-40">
            <defs>
                <pattern id={`rain-back-${isFire}`} width="50" height="50" patternUnits="userSpaceOnUse">
                    <rect x="10" y="0" width="2" height="4" fill={isFire ? "#ff3d00" : (color || "#B3E5FC")} />
                    <rect x="35" y="25" width="2" height="4" fill={isFire ? "#ff3d00" : (color || "#B3E5FC")} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#rain-back-${isFire})`} />
        </svg>
        <svg className="absolute inset-0 w-full h-[200%] -top-full animate-rain-medium opacity-60">
            <defs>
                <pattern id={`rain-mid-${isFire}`} width="40" height="40" patternUnits="userSpaceOnUse">
                    <rect x="5" y="0" width="2" height="8" fill={isFire ? "#ff3d00" : (color || "#81D4FA")} />
                    <rect x="25" y="20" width="2" height="8" fill={isFire ? "#ff3d00" : (color || "#81D4FA")} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#rain-mid-${isFire})`} />
        </svg>
    </div>
);

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
                <path d="M2 10 Q 0 4 4 2 L 6 4 L 4 10 Z" fill="#795548" />
                <rect x="5" y="6" width="6" height="6" fill="#A1887F" />
                <rect x="10" y="4" width="4" height="4" fill="#A1887F" />
                <rect x="10" y="2" width="1" height="2" fill="#5D4037" />
                <rect x="13" y="2" width="1" height="2" fill="#5D4037" />
                <rect x="12" y="5" width="1" height="1" fill="#000" />
                <rect x="5" y="12" width="2" height="1" fill="#5D4037" />
                <rect x="9" y="12" width="2" height="1" fill="#5D4037" />
             </svg>
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
             
             {showRain && <PixelRain color={themeMode === 'day' ? '#29b6f6' : undefined} />}
             {showEmbers && <PixelRain isFire={true} />}

             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 160 100" shapeRendering="crispEdges">
                 <path d="M0 100 V 50 L 30 20 L 60 55 L 90 25 L 120 60 L 160 30 V 100 Z" 
                       fill={currentTheme.mountain} className="transition-colors duration-1000" />
                 <path d="M0 100 V 70 Q 40 60 80 75 T 160 65 V 100 Z" 
                       fill={currentTheme.hillFar} className="transition-colors duration-1000" />
                 <path d="M0 100 V 85 Q 30 80 60 88 T 120 82 T 160 90 V 100 Z" 
                       fill={currentTheme.hillNear} className="transition-colors duration-1000" />
                 <rect x="0" y="94" width="160" height="6" fill={currentTheme.ground} className="transition-colors duration-1000" />
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
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [incidentMessage, setIncidentMessage] = useState<string | null>(null);
  const [isDead, setIsDead] = useState(false);
  const [weather, setWeather] = useState<'sunny' | 'rainy'>('sunny');
  const [themeMode, setThemeMode] = useState<'day' | 'night'>('day');

  // Health System
  const [health, setHealth] = useState(100);
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
        const hour = now.getHours();
        setThemeMode(hour >= 6 && hour < 18 ? 'day' : 'night');
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for external state (Simulation of GitHub Action / Backend update)
  useEffect(() => {
      if (isDemoMode) return;

      const fetchData = async () => {
          try {
              const res = await fetch('./data/state.json');
              if (res.ok) {
                  const data = await res.json();
                  // In a real environment, these would map to the "backend" state
                  if (data.current_hp !== undefined) setHealth(data.current_hp);
                  if (data.last_incident_timestamp) setLastIncident(data.last_incident_timestamp);
                  if (data.status === 'dead') setIsDead(true);
                  if (data.status === 'healthy') setIsDead(false);
                  
                  // If we see a message we haven't shown, we could show it (simplification)
                  if (data.last_update_message && Math.random() > 0.95) {
                      setIncidentMessage(data.last_update_message);
                      setTimeout(() => setIncidentMessage(null), 4000);
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

  const diff = currentTime - lastIncident;
  const timeUnit = isDemoMode ? TIME_UNITS.SECOND : TIME_UNITS.DAY; 
  const unitsPassed = Math.floor(diff / timeUnit);
  
  let currentStageIndex = STAGES.findIndex((s) => unitsPassed < s.threshold) - 1;
  if (currentStageIndex === -2) currentStageIndex = STAGES.length - 1; 
  if (currentStageIndex < 0) currentStageIndex = 0;

  const currentStage = STAGES[currentStageIndex];
  const maxHealth = (currentStageIndex + 1) * 50 + 50; // HP grows with level

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
  if (currentStageIndex < STAGES.length - 1) {
      const currentThreshold = currentStage.threshold;
      const nextThreshold = STAGES[currentStageIndex + 1].threshold;
      progress = ((unitsPassed - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
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
        
        @keyframes rain-fall {
            0% { transform: translateY(0) skewX(-5deg); }
            100% { transform: translateY(50%) skewX(-5deg); }
        }
        .animate-rain-slow { animation: rain-fall 3s linear infinite; }
        .animate-rain-medium { animation: rain-fall 2s linear infinite; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes float-up {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
            100% { transform: translateY(-60px) scale(1); opacity: 0; }
        }
        
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
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-600 p-2 rounded shadow-lg text-right justify-self-end">
                    <div className="font-pixel text-[10px] text-purple-200 mb-1 tracking-wider">
                        REALM {currentStageIndex + 1}
                    </div>
                    <div className="w-24 md:w-32 h-2 bg-slate-800 border border-slate-600 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-purple-900/50"></div>
                        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.8)]" style={{ width: `${progress}%` }} />
                    </div>
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
                
                {/* Mode Toggle */}
                <button 
                  onClick={() => setIsDemoMode(!isDemoMode)}
                  className={`btn-mythic border-b-4 rounded p-3 flex items-center gap-2 font-pixel text-[10px] mr-2 ${isDemoMode ? 'bg-purple-600 border-purple-800 text-white' : 'bg-green-700 border-green-900 text-green-100'}`}
                  title="Toggle Simulation vs Real Data"
                >
                    {isDemoMode ? <Zap size={16} /> : <Database size={16} />}
                    <span className="hidden md:inline">{isDemoMode ? 'DEMO MODE' : 'LIVE DATA'}</span>
                </button>

                {/* Simulation Controls (Only visible in Demo Mode) */}
                {isDemoMode && (
                    <>
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

      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);