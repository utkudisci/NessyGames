export type BlockAxis = 'horizontal' | 'vertical';

export interface SlideBlock {
  id: string;
  x: number;
  y: number;
  length: 2 | 3;
  axis: BlockAxis;
  target?: boolean;
}

export interface SlideLevel {
  id: number;
  title: string;
  par: number;
  blocks: SlideBlock[];
}
