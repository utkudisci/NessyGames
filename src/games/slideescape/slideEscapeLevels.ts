import type { SlideLevel } from './slideEscapeTypes';

export const SLIDE_ESCAPE_LEVELS: SlideLevel[] = [
  {
    id: 1, title: 'İlk Çıkış', par: 2,
    blocks: [
      { id: 'target', x: 0, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'a', x: 2, y: 0, length: 3, axis: 'vertical' },
      { id: 'b', x: 3, y: 4, length: 3, axis: 'horizontal' }
    ]
  },
  {
    id: 2, title: 'Dar Geçit', par: 4,
    blocks: [
      { id: 'target', x: 1, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'a', x: 3, y: 1, length: 2, axis: 'vertical' },
      { id: 'b', x: 4, y: 0, length: 3, axis: 'vertical' },
      { id: 'c', x: 0, y: 4, length: 3, axis: 'horizontal' },
      { id: 'd', x: 3, y: 3, length: 2, axis: 'horizontal' }
    ]
  },
  {
    id: 3, title: 'Çifte Kilit', par: 5,
    blocks: [
      { id: 'target', x: 0, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'a', x: 2, y: 1, length: 2, axis: 'vertical' },
      { id: 'b', x: 3, y: 0, length: 3, axis: 'vertical' },
      { id: 'c', x: 4, y: 3, length: 3, axis: 'vertical' },
      { id: 'd', x: 0, y: 4, length: 3, axis: 'horizontal' },
      { id: 'e', x: 2, y: 5, length: 2, axis: 'horizontal' }
    ]
  },
  {
    id: 4, title: 'Kesişen Yollar', par: 7,
    blocks: [
      { id: 'target', x: 0, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'a', x: 2, y: 0, length: 3, axis: 'vertical' },
      { id: 'b', x: 3, y: 1, length: 2, axis: 'vertical' },
      { id: 'c', x: 4, y: 0, length: 2, axis: 'horizontal' },
      { id: 'd', x: 3, y: 3, length: 3, axis: 'horizontal' },
      { id: 'e', x: 5, y: 4, length: 2, axis: 'vertical' },
      { id: 'f', x: 0, y: 5, length: 3, axis: 'horizontal' }
    ]
  },
  {
    id: 5, title: 'Neon Labirent', par: 8,
    blocks: [
      { id: 'target', x: 1, y: 2, length: 2, axis: 'horizontal', target: true },
      { id: 'a', x: 3, y: 0, length: 3, axis: 'vertical' },
      { id: 'b', x: 4, y: 1, length: 2, axis: 'vertical' },
      { id: 'c', x: 0, y: 0, length: 3, axis: 'horizontal' },
      { id: 'd', x: 0, y: 3, length: 2, axis: 'vertical' },
      { id: 'e', x: 1, y: 4, length: 3, axis: 'horizontal' },
      { id: 'f', x: 5, y: 3, length: 3, axis: 'vertical' },
      { id: 'g', x: 2, y: 5, length: 3, axis: 'horizontal' }
    ]
  }
];
