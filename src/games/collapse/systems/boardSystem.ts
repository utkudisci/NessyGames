import type { Board, BoardPosition, BlockData, BoardMovement, BoardUpdateResult } from '../types/collapseTypes';
import { COLLAPSE_COLORS } from '../config/collapseConfig';

// Helper to generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Creates a board of given dimensions filled with random blocks.
 */
export function createBoard(rows: number, cols: number, colorCount: number): Board {
  const board: Board = [];
  const activeColors = COLLAPSE_COLORS.slice(0, colorCount);

  for (let r = 0; r < rows; r++) {
    const rowArray: (BlockData | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const randomColor = activeColors[Math.floor(Math.random() * activeColors.length)];
      rowArray.push({
        id: generateId(),
        row: r,
        column: c,
        color: randomColor,
      });
    }
    board.push(rowArray);
  }

  return board;
}

/**
 * Finds all connected blocks of the same color starting from a given row and column.
 * Uses BFS (Breadth-First Search) to find neighbors.
 */
export function findConnectedGroup(
  board: Board,
  startRow: number,
  startCol: number
): BoardPosition[] {
  const numRows = board.length;
  if (numRows === 0) return [];
  const numCols = board[0].length;

  const startBlock = board[startRow]?.[startCol];
  if (!startBlock) return [];

  const targetColor = startBlock.color;
  const queue: BoardPosition[] = [{ row: startRow, column: startCol }];
  
  // Track visited positions with a 2D boolean array
  const visited: boolean[][] = Array.from({ length: numRows }, () => Array(numCols).fill(false));
  visited[startRow][startCol] = true;

  const group: BoardPosition[] = [];

  const directions = [
    { r: -1, c: 0 }, // Up
    { r: 1, c: 0 },  // Down
    { r: 0, c: -1 }, // Left
    { r: 0, c: 1 },  // Right
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    group.push(curr);

    for (const dir of directions) {
      const nextR = curr.row + dir.r;
      const nextC = curr.column + dir.c;

      // Check bounds
      if (nextR >= 0 && nextR < numRows && nextC >= 0 && nextC < numCols) {
        if (!visited[nextR][nextC]) {
          const neighbor = board[nextR][nextC];
          if (neighbor && neighbor.color === targetColor) {
            visited[nextR][nextC] = true;
            queue.push({ row: nextR, column: nextC });
          }
        }
      }
    }
  }

  return group;
}

/**
 * Checks if there are any valid moves left on the board.
 * A valid move is any adjacent pair of blocks of the same color.
 */
export function hasAvailableMoves(board: Board): boolean {
  const numRows = board.length;
  if (numRows === 0) return false;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const block = board[r][c];
      if (!block) continue;

      // Only need to check right and down neighbors to cover all connections
      const right = c + 1 < numCols ? board[r][c + 1] : null;
      if (right && right.color === block.color) return true;

      const down = r + 1 < numRows ? board[r + 1][c] : null;
      if (down && down.color === block.color) return true;
    }
  }

  return false;
}

/**
 * Process board changes after removing blocks: dikey çökme (gravity) and yatay çökme (column shift).
 * Returns the updated board and a list of movements describing how blocks moved.
 */
export function collapseBoard(board: Board): BoardUpdateResult {
  const numRows = board.length;
  if (numRows === 0) {
    return { board: [], movements: [], removedBlockCount: 0, columnsShifted: 0 };
  }
  const numCols = board[0].length;

  // Clone board to avoid mutating original state
  const workingBoard: Board = board.map(row => row.map(cell => cell ? { ...cell } : null));

  // Map to track the original position of each remaining block by ID before collapse
  const initialPositions = new Map<string, BoardPosition>();
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const block = workingBoard[r][c];
      if (block) {
        initialPositions.set(block.id, { row: r, column: c });
      }
    }
  }

  // 1. Dikey çökme (Gravity) in-place on workingBoard
  for (let c = 0; c < numCols; c++) {
    // Collect all blocks in this column from bottom to top
    const blocksInCol: BlockData[] = [];
    for (let r = numRows - 1; r >= 0; r--) {
      if (workingBoard[r][c]) {
        blocksInCol.push(workingBoard[r][c]!);
      }
    }

    // Write them back from bottom to top
    let writeIdx = numRows - 1;
    for (const block of blocksInCol) {
      workingBoard[writeIdx][c] = block;
      block.row = writeIdx; // Update row coordinate
      writeIdx--;
    }

    // Fill remaining top cells with null
    while (writeIdx >= 0) {
      workingBoard[writeIdx][c] = null;
      writeIdx--;
    }
  }

  // 2. Yatay çökme (Column shift) in-place on workingBoard
  // A column is empty if the bottom-most cell is null (since gravity already collapsed everything down)
  const nonColIndices: number[] = [];
  for (let c = 0; c < numCols; c++) {
    if (workingBoard[numRows - 1][c] !== null) {
      nonColIndices.push(c);
    }
  }

  const columnsShifted = numCols - nonColIndices.length;

  // Build the new board state with shifted columns
  const finalBoard: Board = Array.from({ length: numRows }, () => Array(numCols).fill(null));

  for (let newCol = 0; newCol < nonColIndices.length; newCol++) {
    const oldCol = nonColIndices[newCol];
    for (let r = 0; r < numRows; r++) {
      const block = workingBoard[r][oldCol];
      if (block) {
        block.column = newCol; // Update column coordinate
        finalBoard[r][newCol] = block;
      }
    }
  }

  // 3. Compute Net Movements
  const movements: BoardMovement[] = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const block = finalBoard[r][c];
      if (block) {
        const orig = initialPositions.get(block.id)!;
        if (orig.row !== r || orig.column !== c) {
          movements.push({
            blockId: block.id,
            fromRow: orig.row,
            fromCol: orig.column,
            toRow: r,
            toCol: c
          });
        }
      }
    }
  }

  // Count how many blocks were removed (original total - current total)
  let initialCount = initialPositions.size;
  let finalCount = 0;
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (finalBoard[r][c]) finalCount++;
    }
  }

  return {
    board: finalBoard,
    movements,
    removedBlockCount: initialCount - finalCount,
    columnsShifted
  };
}

/**
 * Adds a new row of random blocks at the bottom of the board.
 * Shifts all existing blocks up by 1 row.
 * Returns true if overflow occurs (a block is pushed out of the top row, causing game over).
 */
export function addRowAtBottom(board: Board, colorCount: number): { board: Board, movements: BoardMovement[], overflow: boolean } {
  const numRows = board.length;
  if (numRows === 0) return { board: [], movements: [], overflow: false };
  const numCols = board[0].length;
  const activeColors = COLLAPSE_COLORS.slice(0, colorCount);

  // Check if any block exists in the top row (row 0). Shifting it up will cause overflow!
  let overflow = false;
  for (let c = 0; c < numCols; c++) {
    if (board[0][c] !== null) {
      overflow = true;
      break;
    }
  }

  // Create new board
  const finalBoard: Board = Array.from({ length: numRows }, () => Array(numCols).fill(null));
  const movements: BoardMovement[] = [];

  // Shift existing blocks up from r -> r - 1
  for (let r = 1; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const block = board[r][c];
      if (block) {
        const nextBlock = { ...block, row: r - 1 };
        finalBoard[r - 1][c] = nextBlock;
        movements.push({
          blockId: block.id,
          fromRow: r,
          fromCol: c,
          toRow: r - 1,
          toCol: c
        });
      }
    }
  }

  // Add random row at index `rows - 1` (bottom)
  for (let c = 0; c < numCols; c++) {
    const randomColor = activeColors[Math.floor(Math.random() * activeColors.length)];
    finalBoard[numRows - 1][c] = {
      id: generateId(),
      row: numRows - 1,
      column: c,
      color: randomColor,
    };
  }

  return {
    board: finalBoard,
    movements,
    overflow
  };
}
