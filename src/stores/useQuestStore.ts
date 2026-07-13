import { create } from 'zustand';
import { questService } from '../services/quests/questService';
import type { DailyQuestProgress } from '../services/storage/storageService';

interface QuestState {
  quests: DailyQuestProgress[];
  loadQuests: () => void;
  updateQuestProgress: (type: DailyQuestProgress['type'], amount: number, isSet?: boolean) => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  quests: questService.getQuests(),

  loadQuests: () => {
    set({ quests: questService.getQuests() });
  },

  updateQuestProgress: (type, amount, isSet = false) => {
    const updatedQuests = questService.updateProgress(type, amount, isSet);
    set({ quests: updatedQuests });
  },
}));
