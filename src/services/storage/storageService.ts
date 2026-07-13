export interface UserSettings {
  theme: 'dark' | 'light';
  masterVolume: number; // 0 to 1
  sfxVolume: number;    // 0 to 1
  musicVolume: number;  // 0 to 1
  isMuted: boolean;
}

export interface UserStats {
  gamesPlayed: Record<string, number>; // gameId -> count
  totalPlayTime: Record<string, number>; // gameId -> seconds
  totalBlocksRemoved: Record<string, number>; // gameId -> count
  maxCombo: Record<string, number>; // gameId -> maxCombo
  biggestGroupCleared: Record<string, number>; // gameId -> size
}

export interface DailyQuestProgress {
  id: string;
  type: 'games_played' | 'blocks_removed' | 'single_group' | 'target_score';
  target: number;
  current: number;
  isCompleted: boolean;
  description: string;
}

export interface DailyQuestsData {
  lastCheckedDate: string; // YYYY-MM-DD
  quests: DailyQuestProgress[];
}

const STORAGE_PREFIX = 'gamezone_';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  isMuted: false,
};

const DEFAULT_STATS: UserStats = {
  gamesPlayed: {},
  totalPlayTime: {},
  totalBlocksRemoved: {},
  maxCombo: {},
  biggestGroupCleared: {},
};

export const storageService = {
  // Theme & General Settings
  getSettings(): UserSettings {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}settings`);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(settings));
    // Apply theme class to HTML
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // High Scores
  getHighScore(gameId: string, mode: string): number {
    const score = localStorage.getItem(`${STORAGE_PREFIX}highscore_${gameId}_${mode}`);
    return score ? parseInt(score, 10) : 0;
  },

  saveHighScore(gameId: string, mode: string, score: number): void {
    const currentHighScore = this.getHighScore(gameId, mode);
    if (score > currentHighScore) {
      localStorage.setItem(`${STORAGE_PREFIX}highscore_${gameId}_${mode}`, score.toString());
    }
  },

  // Stats
  getStats(): UserStats {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}stats`);
    if (!raw) return DEFAULT_STATS;
    try {
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_STATS;
    }
  },

  saveStats(stats: UserStats): void {
    localStorage.setItem(`${STORAGE_PREFIX}stats`, JSON.stringify(stats));
  },

  updateStats(gameId: string, updates: {
    blocksRemoved?: number;
    combo?: number;
    groupSize?: number;
    playTime?: number;
    gameCompleted?: boolean;
  }): void {
    const stats = this.getStats();
    
    if (!stats.gamesPlayed[gameId]) stats.gamesPlayed[gameId] = 0;
    if (!stats.totalPlayTime[gameId]) stats.totalPlayTime[gameId] = 0;
    if (!stats.totalBlocksRemoved[gameId]) stats.totalBlocksRemoved[gameId] = 0;
    if (!stats.maxCombo[gameId]) stats.maxCombo[gameId] = 0;
    if (!stats.biggestGroupCleared[gameId]) stats.biggestGroupCleared[gameId] = 0;

    if (updates.gameCompleted) {
      stats.gamesPlayed[gameId] += 1;
    }
    if (updates.playTime) {
      stats.totalPlayTime[gameId] += updates.playTime;
    }
    if (updates.blocksRemoved) {
      stats.totalBlocksRemoved[gameId] += updates.blocksRemoved;
    }
    if (updates.combo && updates.combo > stats.maxCombo[gameId]) {
      stats.maxCombo[gameId] = updates.combo;
    }
    if (updates.groupSize && updates.groupSize > stats.biggestGroupCleared[gameId]) {
      stats.biggestGroupCleared[gameId] = updates.groupSize;
    }

    this.saveStats(stats);
  },

  // Achievements
  getAchievements(): Record<string, boolean> {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}achievements`);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveAchievement(id: string): void {
    const achievements = this.getAchievements();
    achievements[id] = true;
    localStorage.setItem(`${STORAGE_PREFIX}achievements`, JSON.stringify(achievements));
  },

  // Daily Quests
  getDailyQuests(): DailyQuestsData | null {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}daily_quests`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveDailyQuests(data: DailyQuestsData): void {
    localStorage.setItem(`${STORAGE_PREFIX}daily_quests`, JSON.stringify(data));
  },
};
