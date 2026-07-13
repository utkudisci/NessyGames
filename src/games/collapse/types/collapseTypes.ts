export type BlockColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

export interface BlockData {
  id: string;
  row: number;
  column: number;
  color: BlockColor;
}

export type Board = (BlockData | null)[][]; // rows x columns grid

export interface BoardPosition {
  row: number;
  column: number;
}

export interface BoardMovement {
  blockId: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface BoardUpdateResult {
  board: Board;
  movements: BoardMovement[];
  removedBlockCount: number;
  columnsShifted: number;
}
