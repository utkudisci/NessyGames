import { create } from 'zustand';
import { storageService } from '../services/storage/storageService';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
}

export const ACHIEVEMENT_REGISTRY: Record<string, Omit<Achievement, 'isUnlocked'>> = {
  first_game: {
    id: 'first_game',
    title: 'İlk Oyun',
    description: 'İlk kez bir oyun tamamla.',
    icon: '🏆',
  },
  big_bang: {
    id: 'big_bang',
    title: 'Büyük Patlama',
    description: 'Tek hamlede en az 10 blok kaldır.',
    icon: '💥',
  },
  combo_start: {
    id: 'combo_start',
    title: 'Combo Başlangıcı',
    description: 'İlk kombo hareketini yap.',
    icon: '⚡',
  },
  puzzle_master: {
    id: 'puzzle_master',
    title: 'Puzzle Ustası',
    description: '10.000 puana ulaş.',
    icon: '🧩',
  },
  clean_board: {
    id: 'clean_board',
    title: 'Temiz Tahta',
    description: 'Tahtadaki bütün blokları kaldır.',
    icon: '🧹',
  },
  loyal_player: {
    id: 'loyal_player',
    title: 'Sadık Oyuncu',
    description: 'Oyunu 10 kez oyna.',
    icon: '🔥',
  },
};

interface AchievementToast {
  id: string;
  title: string;
  icon: string;
  description: string;
}

interface AchievementState {
  achievements: Achievement[];
  activeToasts: AchievementToast[];
  unlockAchievement: (id: string) => void;
  dismissToast: (id: string) => void;
  refreshAchievements: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: Object.values(ACHIEVEMENT_REGISTRY).map(ach => ({
    ...ach,
    isUnlocked: !!storageService.getAchievements()[ach.id],
  })),
  activeToasts: [],

  refreshAchievements: () => {
    set({
      achievements: Object.values(ACHIEVEMENT_REGISTRY).map(ach => ({
        ...ach,
        isUnlocked: !!storageService.getAchievements()[ach.id],
      })),
    });
  },

  unlockAchievement: (id) => {
    const registryEntry = ACHIEVEMENT_REGISTRY[id];
    if (!registryEntry) return;

    const currentUnlocked = storageService.getAchievements();
    if (currentUnlocked[id]) return; // Already unlocked

    storageService.saveAchievement(id);
    get().refreshAchievements();

    // Trigger toast notification
    const toastId = `${id}_${Date.now()}`;
    set(state => ({
      activeToasts: [
        ...state.activeToasts,
        { id: toastId, title: registryEntry.title, icon: registryEntry.icon, description: registryEntry.description },
      ],
    }));

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      get().dismissToast(toastId);
    }, 4000);
  },

  dismissToast: (id) => {
    set(state => ({
      activeToasts: state.activeToasts.filter(t => t.id !== id),
    }));
  },
}));
