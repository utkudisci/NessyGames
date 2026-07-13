export interface CompoundColorInfo {
  color: string;
  name: string;
}

export const MADLAB_COMPOUNDS: CompoundColorInfo[] = [
  { color: '#ff3b30', name: 'Pyro-Gel (Red)' },
  { color: '#34c759', name: 'Bio-Toxin (Green)' },
  { color: '#007aff', name: 'Cryo-Fluid (Blue)' },
  { color: '#ffcc00', name: 'Solar-Plasma (Yellow)' },
  { color: '#af52de', name: 'Dark-Matter (Purple)' },
  { color: '#ff9500', name: 'Acid-Catalyst (Orange)' },
  { color: '#5ac8fa', name: 'Aero-Gas (Cyan)' },
  { color: '#e0a4f9', name: 'Quantum-Serum (Pink)' },
  { color: '#8e8e93', name: 'Nano-Sludge (Grey)' },
  { color: '#a2845e', name: 'Eco-Mutagen (Brown)' },
  { color: '#34e0a1', name: 'Radon-Gas (Teal)' },
  { color: '#e034a1', name: 'Hyper-Acid (Magenta)' },
];

export interface GameDifficulty {
  colorsCount: number;
  emptyTubesCount: number;
  capacity: number;
  starMovesLimit: number; // Star rating threshold (optional)
}

export const MADLAB_DIFFICULTIES: Record<string, GameDifficulty> = {
  easy: {
    colorsCount: 3,
    emptyTubesCount: 2,
    capacity: 4,
    starMovesLimit: 12,
  },
  medium: {
    colorsCount: 6,
    emptyTubesCount: 2,
    capacity: 4,
    starMovesLimit: 32,
  },
  hard: {
    colorsCount: 9,
    emptyTubesCount: 2,
    capacity: 4,
    starMovesLimit: 60,
  },
  expert: {
    colorsCount: 11,
    emptyTubesCount: 2,
    capacity: 4,
    starMovesLimit: 85,
  },
};

export const MADLAB_CONFIG = {
  TUBE_CAPACITY: 4,
  MAX_TUBE_HEIGHT: 180,
  TUBE_WIDTH: 50,
  TUBE_SPACING: 30,
};
