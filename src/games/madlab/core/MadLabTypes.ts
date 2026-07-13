export interface CompoundBlock {
  color: string;      // Color hex string (e.g. '#ff4e50')
  name: string;       // Dynamic compound name (e.g. 'Catalyst Red')
  isFrozen?: boolean; // If true, cannot be poured until thawed/cleared
}

export interface TubeState {
  id: string;
  blocks: CompoundBlock[]; // Bottom to top
  capacity: number;
  isLocked?: boolean; // If true, cannot select or pour into/out of
}

export interface MoveRecord {
  fromTubeId: string;
  toTubeId: string;
  blocks: CompoundBlock[]; // Blocks that were moved
}

export interface GameState {
  tubes: TubeState[];
  moves: MoveRecord[];
}
