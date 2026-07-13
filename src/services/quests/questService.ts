import { storageService } from '../storage/storageService';
import type { DailyQuestProgress, DailyQuestsData } from '../storage/storageService';

const QUEST_TEMPLATES = [
  {
    id: 'quest_play_games',
    type: 'games_played' as const,
    target: 3,
    description: 'Bugün 3 oyun oyna.',
  },
  {
    id: 'quest_remove_blocks',
    type: 'blocks_removed' as const,
    target: 100,
    description: 'Bugün toplam 100 blok kaldır.',
  },
  {
    id: 'quest_single_group',
    type: 'single_group' as const,
    target: 8,
    description: 'Tek bir hamlede en az 8 blok kaldır.',
  },
  {
    id: 'quest_target_score',
    type: 'target_score' as const,
    target: 5000,
    description: 'Herhangi bir oyunda 5.000 puana ulaş.',
  },
];

export const questService = {
  getQuests(): DailyQuestProgress[] {
    const todayStr = new Date().toISOString().split('T')[0];
    const data = storageService.getDailyQuests();

    if (!data || data.lastCheckedDate !== todayStr) {
      // Initialize or reset quests for the new day
      const initialQuests: DailyQuestProgress[] = QUEST_TEMPLATES.map(q => ({
        ...q,
        current: 0,
        isCompleted: false,
      }));
      
      const newData: DailyQuestsData = {
        lastCheckedDate: todayStr,
        quests: initialQuests,
      };

      storageService.saveDailyQuests(newData);
      return initialQuests;
    }

    return data.quests;
  },

  updateProgress(type: DailyQuestProgress['type'], amount: number, isSet: boolean = false): DailyQuestProgress[] {
    const quests = this.getQuests();
    const todayStr = new Date().toISOString().split('T')[0];
    
    let updated = false;
    const nextQuests = quests.map(q => {
      if (q.type === type && !q.isCompleted) {
        let nextCurrent = isSet ? amount : q.current + amount;
        // Keep single_group to be the max single group cleared today
        if (type === 'single_group') {
          nextCurrent = Math.max(q.current, amount);
        }

        const isCompleted = nextCurrent >= q.target;
        updated = true;
        return {
          ...q,
          current: Math.min(nextCurrent, q.target),
          isCompleted,
        };
      }
      return q;
    });

    if (updated) {
      storageService.saveDailyQuests({
        lastCheckedDate: todayStr,
        quests: nextQuests,
      });
    }

    return nextQuests;
  },
};
