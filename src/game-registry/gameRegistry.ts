import type { GameMetadata } from './gameTypes';
import { CollapseGame } from '../games/collapse/CollapseGame';
import { MadLabGame } from '../games/madlab/MadLabGame';

export const gameRegistry: GameMetadata[] = [
  {
    id: 'collapse',
    title: 'Collapse Puzzle',
    description: 'Aynı renkteki blokları yan yana getirerek patlatın! Klasik, Süreli ve Arcade oyun modları ile sınırlarınızı zorlayın.',
    thumbnail: '/assets/images/collapse_thumbnail.png',
    route: 'collapse',
    categories: ['Puzzle', 'Matching', 'Casual'],
    status: 'available',
    component: CollapseGame,
    highScoreSupported: true,
    modes: ['classic', 'time', 'arcade'],
  },
  {
    id: 'madlab',
    title: 'MadLab Color Sort',
    description: 'Dengesiz kimyasal bileşikleri ayrıştırın ve her test tüpünde yalnızca tek bir renk kalmasını sağlayın. Stratejik ve eğlenceli!',
    thumbnail: '/assets/images/madlab_thumbnail.png',
    route: 'madlab',
    categories: ['Puzzle', 'Sorting', 'Casual'],
    status: 'available',
    component: MadLabGame,
    highScoreSupported: true,
    modes: ['classic', 'daily'],
  },
  {
    id: 'tetris-coming',
    title: 'Block Stack (Tetris)',
    description: 'Blokları düzenli bir şekilde üst üste yerleştirerek satırları temizleyin. Çok yakında platformumuzda!',
    thumbnail: '/assets/images/tetris_thumbnail.png',
    route: 'tetris',
    categories: ['Retro', 'Puzzle'],
    status: 'coming-soon',
    component: () => null,
    highScoreSupported: false,
    modes: [],
  },
  {
    id: 'solitaire-coming',
    title: 'Premium Solitaire',
    description: 'Zamanın eskitemediği popüler kart oyunu Solitaire, modern tasarımla sizlerle buluşuyor. Çok yakında!',
    thumbnail: '/assets/images/solitaire_thumbnail.png',
    route: 'solitaire',
    categories: ['Cards', 'Casual'],
    status: 'coming-soon',
    component: () => null,
    highScoreSupported: false,
    modes: [],
  }
];

export const getGameById = (id: string): GameMetadata | undefined => {
  return gameRegistry.find(g => g.id === id);
};
