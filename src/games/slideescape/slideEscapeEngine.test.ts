import { describe, expect, it } from 'vitest';
import { cloneBlocks, getMovementRange, isSolved, moveBlock } from './slideEscapeEngine';
import { SLIDE_ESCAPE_LEVELS } from './slideEscapeLevels';
import type { SlideBlock } from './slideEscapeTypes';

function key(blocks: SlideBlock[]) {
  return blocks.map((block) => `${block.id}:${block.x},${block.y}`).join('|');
}

function canSolve(initial: SlideBlock[]) {
  const queue = [cloneBlocks(initial)];
  const seen = new Set([key(initial)]);
  while (queue.length && seen.size < 100_000) {
    const blocks = queue.shift()!;
    if (isSolved(blocks)) return true;
    for (const block of blocks) {
      const range = getMovementRange(blocks, block.id);
      const current = block.axis === 'horizontal' ? block.x : block.y;
      for (let position = range.min; position <= range.max; position++) {
        if (position === current) continue;
        const next = moveBlock(blocks, block.id, position);
        const stateKey = key(next);
        if (!seen.has(stateKey)) { seen.add(stateKey); queue.push(next); }
      }
    }
  }
  return false;
}

describe('Slide Escape engine', () => {
  it('blocks movement at occupied cells', () => {
    const blocks: SlideBlock[] = [
      { id: 'target', x: 0, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'wall', x: 3, y: 1, length: 2, axis: 'vertical' }
    ];
    expect(getMovementRange(blocks, 'target')).toEqual({ min: 0, max: 1 });
  });

  it('recognizes the target at the right exit', () => {
    const blocks: SlideBlock[] = [{ id: 'target', x: 4, y: 2, length: 2, axis: 'horizontal', target: true }];
    expect(isSolved(blocks)).toBe(true);
  });

  it.each(SLIDE_ESCAPE_LEVELS)('level $id has a solution', (level) => {
    expect(canSolve(level.blocks)).toBe(true);
  });
});
