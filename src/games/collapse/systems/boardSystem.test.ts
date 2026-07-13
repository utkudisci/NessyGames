import { describe, it, expect } from 'vitest';
import { createBoard, findConnectedGroup, hasAvailableMoves, collapseBoard } from './boardSystem';
import type { Board, BlockData } from '../types/collapseTypes';

// Helper to create a custom static board for testing
function createTestBoard(grid: (string | null)[][]): Board {
  const board: Board = [];
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    const rowArray: (BlockData | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const colorChar = grid[r][c];
      if (colorChar === null) {
        rowArray.push(null);
      } else {
        let color: BlockData['color'] = 'red';
        if (colorChar === 'B') color = 'blue';
        if (colorChar === 'G') color = 'green';
        if (colorChar === 'Y') color = 'yellow';
        if (colorChar === 'P') color = 'purple';

        rowArray.push({
          id: `b_${r}_${c}`,
          row: r,
          column: c,
          color,
        });
      }
    }
    board.push(rowArray);
  }
  return board;
}

describe('Board System', () => {
  it('should generate board with correct rows and columns', () => {
    const board = createBoard(8, 6, 4);
    expect(board.length).toBe(8);
    expect(board[0].length).toBe(6);
    // Ensure all cells are populated
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        expect(board[r][c]).not.toBeNull();
      }
    }
  });

  it('should find connected groups correctly', () => {
    // 3x3 custom grid
    // R R B
    // G R Y
    // G G Y
    const grid = [
      ['R', 'R', 'B'],
      ['G', 'R', 'Y'],
      ['G', 'G', 'Y']
    ];
    const board = createTestBoard(grid);

    // Starting at (0, 0) should find (0, 0), (0, 1), (1, 1)
    const redGroup = findConnectedGroup(board, 0, 0);
    expect(redGroup.length).toBe(3);
    expect(redGroup).toContainEqual({ row: 0, column: 0 });
    expect(redGroup).toContainEqual({ row: 0, column: 1 });
    expect(redGroup).toContainEqual({ row: 1, column: 1 });

    // Starting at (1, 0) should find (1, 0), (2, 0), (2, 1)
    const greenGroup = findConnectedGroup(board, 1, 0);
    expect(greenGroup.length).toBe(3);
    expect(greenGroup).toContainEqual({ row: 1, column: 0 });
    expect(greenGroup).toContainEqual({ row: 2, column: 0 });
    expect(greenGroup).toContainEqual({ row: 2, column: 1 });

    // Starting at (0, 2) should only find (0, 2)
    const blueGroup = findConnectedGroup(board, 0, 2);
    expect(blueGroup.length).toBe(1);
    expect(blueGroup).toContainEqual({ row: 0, column: 2 });
  });

  it('should verify available moves correctly', () => {
    const gridWithMoves = [
      ['R', 'B'],
      ['R', 'G']
    ];
    const boardWithMoves = createTestBoard(gridWithMoves);
    expect(hasAvailableMoves(boardWithMoves)).toBe(true);

    const gridNoMoves = [
      ['R', 'B'],
      ['G', 'Y']
    ];
    const boardNoMoves = createTestBoard(gridNoMoves);
    expect(hasAvailableMoves(boardNoMoves)).toBe(false);
  });

  it('should collapse board vertically (gravity)', () => {
    // R null B
    // null R B
    // G R Y
    const grid = [
      ['R', null, 'B'],
      [null, 'R', 'B'],
      ['G', 'R', 'Y']
    ];
    const board = createTestBoard(grid);

    // Remove red block at (2,1), (1,1) first to test gravity
    board[2][1] = null;
    board[1][1] = null;

    const result = collapseBoard(board);
    
    // Since column 1 became completely empty, column 2 (B, B, Y) shifted into column 1
    expect(result.board[0][1]?.color).toBe('blue');
    expect(result.board[1][1]?.color).toBe('blue');
    expect(result.board[2][1]?.color).toBe('yellow');

    // Column 2 should now be completely null
    expect(result.board[0][2]).toBeNull();
    expect(result.board[1][2]).toBeNull();
    expect(result.board[2][2]).toBeNull();

    // In column 0, row 1 had null. The R from row 0 should fall to row 1
    // And G in row 2 should remain in row 2
    expect(result.board[0][0]).toBeNull();
    expect(result.board[1][0]?.color).toBe('red');
    expect(result.board[2][0]?.color).toBe('green');
  });

  it('should collapse board horizontally (column shift)', () => {
    // R null B
    // R null Y
    // R null Y
    const grid = [
      ['R', null, 'B'],
      ['R', null, 'Y'],
      ['R', null, 'Y']
    ];
    const board = createTestBoard(grid);

    const result = collapseBoard(board);

    // Column 1 is empty, column 2 (B, Y, Y) should shift to column 1
    expect(result.board[0][1]?.color).toBe('blue');
    expect(result.board[1][1]?.color).toBe('yellow');
    expect(result.board[2][1]?.color).toBe('yellow');

    // Column 2 is now completely null
    expect(result.board[0][2]).toBeNull();
    expect(result.board[1][2]).toBeNull();
    expect(result.board[2][2]).toBeNull();
  });
});
