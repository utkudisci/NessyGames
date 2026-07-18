import type { SlideBlock } from './slideEscapeTypes';

export const GRID_SIZE = 6;

export function cloneBlocks(blocks: SlideBlock[]): SlideBlock[] {
  return blocks.map((block) => ({ ...block }));
}

export function getMovementRange(blocks: SlideBlock[], blockId: string): { min: number; max: number } {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return { min: 0, max: 0 };

  const occupied = new Set<string>();
  for (const item of blocks) {
    if (item.id === blockId) continue;
    for (let offset = 0; offset < item.length; offset++) {
      const x = item.x + (item.axis === 'horizontal' ? offset : 0);
      const y = item.y + (item.axis === 'vertical' ? offset : 0);
      occupied.add(`${x},${y}`);
    }
  }

  const position = block.axis === 'horizontal' ? block.x : block.y;
  const fixed = block.axis === 'horizontal' ? block.y : block.x;
  let min = position;
  let max = position;

  while (min > 0) {
    const x = block.axis === 'horizontal' ? min - 1 : fixed;
    const y = block.axis === 'vertical' ? min - 1 : fixed;
    if (occupied.has(`${x},${y}`)) break;
    min--;
  }

  while (max + block.length < GRID_SIZE) {
    const x = block.axis === 'horizontal' ? max + block.length : fixed;
    const y = block.axis === 'vertical' ? max + block.length : fixed;
    if (occupied.has(`${x},${y}`)) break;
    max++;
  }

  return { min, max };
}

export function moveBlock(blocks: SlideBlock[], blockId: string, position: number): SlideBlock[] {
  const range = getMovementRange(blocks, blockId);
  const nextPosition = Math.max(range.min, Math.min(range.max, Math.round(position)));
  return blocks.map((block) => block.id !== blockId ? block : {
    ...block,
    ...(block.axis === 'horizontal' ? { x: nextPosition } : { y: nextPosition })
  });
}

export function isSolved(blocks: SlideBlock[]): boolean {
  const target = blocks.find((block) => block.target);
  return Boolean(target && target.axis === 'horizontal' && target.y === 2 && target.x + target.length === GRID_SIZE);
}
