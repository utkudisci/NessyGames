import type { TubeState, CompoundBlock, MoveRecord } from './MadLabTypes';
import { MADLAB_COMPOUNDS, type GameDifficulty } from '../config/madlabConfig';

// Serializes the tubes state to check for visited states in solver
// We sort the tubes (excluding their ID) because the permutation of tubes doesn't change the game state
export function serializeState(tubes: TubeState[]): string {
  return tubes
    .map((t) => t.blocks.map((b) => b.color).join(','))
    .sort()
    .join('|');
}

// Deep clones the tube array to avoid mutations during solver search
export function cloneTubes(tubes: TubeState[]): TubeState[] {
  return tubes.map((t) => ({
    ...t,
    blocks: t.blocks.map((b) => ({ ...b })),
  }));
}

// Checks if a single tube is fully sorted (either empty OR full with identical colors)
export function isTubeComplete(tube: TubeState): boolean {
  if (tube.blocks.length === 0) return true;
  if (tube.blocks.length < tube.capacity) return false;
  const firstColor = tube.blocks[0].color;
  return tube.blocks.every((b) => b.color === firstColor);
}

// Checks if the entire board is sorted
export function isGameComplete(tubes: TubeState[]): boolean {
  return tubes.every((t) => isTubeComplete(t));
}

// Validation rules for pouring from one tube to another
export function isValidMove(fromTube: TubeState, toTube: TubeState): boolean {
  // Can't pour to the same tube
  if (fromTube.id === toTube.id) return false;

  // Can't pour from an empty tube or to a locked/full tube
  if (fromTube.blocks.length === 0) return false;
  if (fromTube.isLocked || toTube.isLocked) return false;
  if (toTube.blocks.length >= toTube.capacity) return false;

  const topBlock = fromTube.blocks[fromTube.blocks.length - 1];
  if (topBlock.isFrozen) return false; // Frozen blocks cannot be poured

  // If destination is empty, it's always valid
  if (toTube.blocks.length === 0) return true;

  const destTopBlock = toTube.blocks[toTube.blocks.length - 1];
  // Otherwise, top colors must match
  return topBlock.color === destTopBlock.color;
}

// Calculate how many blocks of the same color can be poured consecutively
export function getPourableBlocksCount(fromTube: TubeState, toTube: TubeState): number {
  if (!isValidMove(fromTube, toTube)) return 0;

  const topColor = fromTube.blocks[fromTube.blocks.length - 1].color;
  
  // Count matching blocks at the top of fromTube
  let matchingCount = 0;
  for (let i = fromTube.blocks.length - 1; i >= 0; i--) {
    if (fromTube.blocks[i].color === topColor && !fromTube.blocks[i].isFrozen) {
      matchingCount++;
    } else {
      break;
    }
  }

  // Count available space in toTube
  const availableSpace = toTube.capacity - toTube.blocks.length;

  return Math.min(matchingCount, availableSpace);
}

// Executes a pour, mutating the passed tubes and returning the MoveRecord (or null if invalid)
export function executePour(
  tubes: TubeState[],
  fromTubeId: string,
  toTubeId: string
): MoveRecord | null {
  const fromTube = tubes.find((t) => t.id === fromTubeId);
  const toTube = tubes.find((t) => t.id === toTubeId);

  if (!fromTube || !toTube) return null;

  const count = getPourableBlocksCount(fromTube, toTube);
  if (count <= 0) return null;

  const movedBlocks: CompoundBlock[] = [];
  for (let i = 0; i < count; i++) {
    const block = fromTube.blocks.pop();
    if (block) {
      movedBlocks.push(block);
    }
  }

  // Push them to destination (we reverse because pop gets top first, so we push them back in correct order)
  for (let i = movedBlocks.length - 1; i >= 0; i--) {
    toTube.blocks.push(movedBlocks[i]);
  }

  return {
    fromTubeId,
    toTubeId,
    blocks: movedBlocks.reverse(), // Topmost blocks that were moved
  };
}

// Reverts a move
export function undoMove(tubes: TubeState[], move: MoveRecord): void {
  const fromTube = tubes.find((t) => t.id === move.fromTubeId);
  const toTube = tubes.find((t) => t.id === move.toTubeId);

  if (!fromTube || !toTube) return;

  // Pop blocks from toTube and push back to fromTube
  const count = move.blocks.length;
  const blocksToRestore: CompoundBlock[] = [];
  for (let i = 0; i < count; i++) {
    const block = toTube.blocks.pop();
    if (block) {
      blocksToRestore.push(block);
    }
  }

  // Restore in the original order
  for (let i = blocksToRestore.length - 1; i >= 0; i--) {
    fromTube.blocks.push(blocksToRestore[i]);
  }
}

// BFS Solver to verify solvability and return optimal moves path
export function solvePuzzle(initialTubes: TubeState[]): MoveRecord[] | null {
  interface QueueNode {
    tubes: TubeState[];
    path: MoveRecord[];
  }

  const queue: QueueNode[] = [{ tubes: cloneTubes(initialTubes), path: [] }];
  const visited = new Set<string>();
  visited.add(serializeState(initialTubes));

  // Cap steps to prevent infinite loop or memory issues in complex expert states
  let steps = 0;
  const MAX_STEPS = 8000;

  while (queue.length > 0 && steps < MAX_STEPS) {
    steps++;
    const current = queue.shift();
    if (!current) break;

    if (isGameComplete(current.tubes)) {
      return current.path;
    }

    // Try all possible valid moves
    for (let i = 0; i < current.tubes.length; i++) {
      for (let j = 0; j < current.tubes.length; j++) {
        if (i === j) continue;

        const from = current.tubes[i];
        const to = current.tubes[j];

        if (isValidMove(from, to)) {
          const nextTubes = cloneTubes(current.tubes);
          const moveRecord = executePour(nextTubes, from.id, to.id);

          if (moveRecord) {
            const stateStr = serializeState(nextTubes);
            if (!visited.has(stateStr)) {
              visited.add(stateStr);
              queue.push({
                tubes: nextTubes,
                path: [...current.path, moveRecord],
              });
            }
          }
        }
      }
    }
  }

  return null; // Unsolvable or limit exceeded
}

// Generates a random level that is verified solvable
export function generateSolvableLevel(difficulty: GameDifficulty): TubeState[] {
  const { colorsCount, emptyTubesCount, capacity } = difficulty;
  const totalTubes = colorsCount + emptyTubesCount;

  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    
    // Create compound block pool
    const colorPool: CompoundBlock[] = [];
    for (let c = 0; c < colorsCount; c++) {
      const info = MADLAB_COMPOUNDS[c % MADLAB_COMPOUNDS.length];
      for (let i = 0; i < capacity; i++) {
        colorPool.push({
          color: info.color,
          name: info.name,
        });
      }
    }

    // Shuffle pool
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
    }

    // Create tubes list
    const tubes: TubeState[] = [];
    
    // Fill first C tubes
    for (let t = 0; t < colorsCount; t++) {
      const blocks: CompoundBlock[] = [];
      for (let b = 0; b < capacity; b++) {
        const block = colorPool.pop();
        if (block) blocks.push(block);
      }
      tubes.push({
        id: `tube_${t}`,
        blocks,
        capacity,
      });
    }

    // Fill remaining empty tubes
    for (let t = colorsCount; t < totalTubes; t++) {
      tubes.push({
        id: `tube_${t}`,
        blocks: [],
        capacity,
      });
    }

    // Check if it starts in solved state or is solvable
    if (isGameComplete(tubes)) continue;

    const solution = solvePuzzle(tubes);
    if (solution !== null && solution.length > 2) {
      return tubes; // Verified solvable!
    }
  }

  // Fallback to a guaranteed basic state if attempts fail
  const fallbackTubes: TubeState[] = [];
  for (let c = 0; c < colorsCount; c++) {
    const info = MADLAB_COMPOUNDS[c % MADLAB_COMPOUNDS.length];
    fallbackTubes.push({
      id: `tube_${c}`,
      blocks: Array(capacity).fill(null).map(() => ({ color: info.color, name: info.name })),
      capacity,
    });
  }
  for (let c = colorsCount; c < totalTubes; c++) {
    fallbackTubes.push({ id: `tube_${c}`, blocks: [], capacity });
  }
  // Perform random shuffles backwards
  // ...
  return fallbackTubes;
}
