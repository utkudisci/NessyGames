import { create } from 'zustand';
import { storageService } from '../services/storage/storageService';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

interface GameState {
  gameId: string;
  mode: string;
  status: GameStatus;
  score: number;
  highScore: number;
  combo: number;
  timeLeft: number; // for time mode
  level: number;    // for arcade mode
  blocksCleared: number;
  movesMade: number;
  biggestGroup: number;
  lastGroupCleared: number;
  
  // Actions
  startGame: (gameId: string, mode: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  addScore: (points: number) => void;
  setCombo: (comboCount: number) => void;
  addBlocksCleared: (count: number) => void;
  setTimeLeft: (time: number) => void;
  tickTime: () => void;
  addTimeBonus: (seconds: number) => void;
  incrementLevel: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameId: '',
  mode: '',
  status: 'idle',
  score: 0,
  highScore: 0,
  combo: 0,
  timeLeft: 0,
  level: 1,
  blocksCleared: 0,
  movesMade: 0,
  biggestGroup: 0,
  lastGroupCleared: 0,

  startGame: (gameId, mode) => {
    const highScore = storageService.getHighScore(gameId, mode);
    set({
      gameId,
      mode,
      status: 'playing',
      score: 0,
      highScore,
      combo: 0,
      timeLeft: mode === 'time' ? 60 : 0,
      level: 1,
      blocksCleared: 0,
      movesMade: 0,
      biggestGroup: 0,
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  endGame: () => {
    const { gameId, mode, score } = get();
    // Save highscore
    storageService.saveHighScore(gameId, mode, score);

    // Save statistics
    storageService.updateStats(gameId, {
      blocksRemoved: get().blocksCleared,
      combo: get().biggestGroup, // We can track biggest group / combo
      groupSize: get().biggestGroup,
      playTime: mode === 'time' ? (60 - get().timeLeft) : 0, // Approx play time
      gameCompleted: true
    });

    set({ status: 'gameover', highScore: Math.max(get().highScore, score) });
  },

  addScore: (points) => {
    set((state) => ({ score: state.score + points }));
  },

  setCombo: (combo) => {
    set({ combo });
  },

  addBlocksCleared: (count) => {
    set((state) => {
      const nextBlocks = state.blocksCleared + count;
      const nextMoves = state.movesMade + 1;
      const nextBiggest = Math.max(state.biggestGroup, count);

      return {
        blocksCleared: nextBlocks,
        movesMade: nextMoves,
        biggestGroup: nextBiggest,
        lastGroupCleared: count,
      };
    });
  },

  setTimeLeft: (timeLeft) => {
    set({ timeLeft });
  },

  tickTime: () => {
    set((state) => {
      if (state.timeLeft <= 1) {
        // Game Over when time expires
        return { timeLeft: 0 };
      }
      return { timeLeft: state.timeLeft - 1 };
    });
  },

  addTimeBonus: (seconds) => {
    set((state) => ({ timeLeft: Math.min(120, state.timeLeft + seconds) })); // Cap at 120s
  },

  incrementLevel: () => {
    set((state) => ({ level: state.level + 1 }));
  },

  resetGame: () => {
    set({
      status: 'idle',
      score: 0,
      combo: 0,
      timeLeft: 0,
      level: 1,
      blocksCleared: 0,
      movesMade: 0,
      biggestGroup: 0,
      lastGroupCleared: 0,
    });
  },
}));
