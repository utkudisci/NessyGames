import type { BlockColor } from '../types/collapseTypes';

export const COLLAPSE_COLORS: BlockColor[] = ['red', 'blue', 'green', 'yellow', 'purple'];

export const COLLAPSE_CONFIG = {
  DEFAULT_ROWS: 10,
  DEFAULT_COLS: 10,
  DEFAULT_COLOR_COUNT: 5,
  MIN_GROUP_SIZE: 2,
  
  // Scoring
  SCORE_MULTIPLIER: 10,
  
  // Phaser color palette mapping (Hex codes for Graphics rendering)
  COLOR_PALETTE: {
    red: 0xff4e50,      // Vibrant coral-red
    blue: 0x3b82f6,     // Sleek royal blue
    green: 0x10b981,    // Emerald green
    yellow: 0xf59e0b,   // Amber yellow
    purple: 0x8b5cf6,   // Violet purple
  } as Record<BlockColor, number>,

  // Phaser glow/accent color mapping
  GLOW_PALETTE: {
    red: 0xff7b7d,
    blue: 0x60a5fa,
    green: 0x34d399,
    yellow: 0xfbbf24,
    purple: 0xa78bfa,
  } as Record<BlockColor, number>,

  // Arcade Mode config
  ARCADE: {
    INITIAL_SPAWN_INTERVAL: 12000, // Starts at 12 seconds per row
    MIN_SPAWN_INTERVAL: 1500,      // Limits to 1.5 seconds at higher difficulties
    DIFFICULTY_SPEED_UP: 500,      // Reduce interval by 500ms per level/score target
    WARNING_ROW: 2,                // Warning starts if any block reaches row 2 or above (top 3 rows)
    COUNTDOWN_TIME: 7,             // Player has 7 seconds to clear blocks once warning triggers
  },

  // Classic Mode config
  CLASSIC: {
    STARTING_ROWS: 4,              // Starts with 4 rows of blocks
    MOVES_PER_SPAWN: 3,            // A new row spawns every 3 moves
  },

  // Time Mode config
  TIME: {
    STARTING_ROWS: 3,              // Starts with 3 rows of blocks
    SPAWN_INTERVAL: 3500,          // A new row spawns every 3.5 seconds
  }
};
