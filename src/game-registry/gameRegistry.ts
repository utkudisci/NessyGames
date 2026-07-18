import type { GameMetadata } from './gameTypes';
import { CollapseGame } from '../games/collapse/CollapseGame';
import { MadLabGame } from '../games/madlab/MadLabGame';
import { SlideEscapeGame } from '../games/slideescape/SlideEscapeGame';

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
    id: 'slide-escape',
    title: 'Slide Escape',
    description: 'Blokları yalnızca kendi yönlerinde kaydır, neon hedef bloğun önündeki yolu aç ve onu 6×6 tahtadan mümkün olan en az hamlede çıkar.',
    thumbnail: '/assets/images/slide_escape_thumbnail.svg',
    route: 'slide-escape',
    categories: ['Puzzle', 'Logic', 'Sliding'],
    status: 'available',
    component: SlideEscapeGame,
    highScoreSupported: false,
    modes: ['classic'],
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
