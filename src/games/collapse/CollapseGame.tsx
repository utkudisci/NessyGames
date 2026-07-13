import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainGameScene } from './scenes/MainGameScene';
import { gameEventBus } from './utils/eventBus';
import { useGameStore } from '../../stores/useGameStore';
import { useAchievementStore } from '../../stores/useAchievementStore';
import { useQuestStore } from '../../stores/useQuestStore';
import { audioService } from '../../services/audio/audioService';
import { storageService } from '../../services/storage/storageService';

interface CollapseGameProps {
  mode: string;
}

export const CollapseGame: React.FC<CollapseGameProps> = ({ mode }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  const { status, score, level, addScore, setCombo, addBlocksCleared, incrementLevel, endGame } = useGameStore();
  const { unlockAchievement } = useAchievementStore();
  const { updateQuestProgress } = useQuestStore();

  // 1. Level progress trigger for Arcade Mode
  useEffect(() => {
    if (mode === 'arcade' && status === 'playing') {
      // Advance level for every 1000 points
      const calculatedLevel = Math.floor(score / 3000) + 1;
      if (calculatedLevel > level) {
        incrementLevel();
        audioService.playBonus(); // Play sound level up

        // Tell Phaser to increase row fall speed
        const phaserGame = gameInstanceRef.current;
        if (phaserGame) {
          const mainScene = phaserGame.scene.getScene('MainGameScene') as MainGameScene;
          if (mainScene && typeof mainScene.updateArcadeSpeed === 'function') {
            mainScene.updateArcadeSpeed(calculatedLevel);
          }
        }
      }
    }
  }, [score, level, mode, status, incrementLevel]);

  // 2. Play Background music on start
  useEffect(() => {
    if (status === 'playing') {
      audioService.startMusic();
    } else {
      audioService.stopMusic();
    }
    return () => {
      audioService.stopMusic();
    };
  }, [status]);

  // 3. React-to-Phaser pause state synchronization
  useEffect(() => {
    const phaserGame = gameInstanceRef.current;
    if (phaserGame && phaserGame.scene.isActive('MainGameScene')) {
      const mainScene = phaserGame.scene.getScene('MainGameScene') as MainGameScene;
      if (mainScene) {
        mainScene.setPause(status === 'paused');
      }
    }
  }, [status]);

  // 4. Initialize Phaser game on mount
  useEffect(() => {
    if (!gameContainerRef.current) return;

    // Phaser Config
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameContainerRef.current,
      backgroundColor: '#090d16',
      transparent: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      scene: [BootScene, PreloadScene, MainGameScene],
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;

    // Monitor parent container resizing using ResizeObserver to solve React Flexbox initial width settle delays
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && gameInstanceRef.current) {
          gameInstanceRef.current.scale.resize(width, height);
        }
      }
    });

    if (gameContainerRef.current) {
      resizeObserver.observe(gameContainerRef.current);
    }

    // Trigger game start parameter configurations inside main game scene
    game.events.once('ready', () => {
      game.scene.start('MainGameScene', { mode });
    });

    // --- Register Event Bus Listeners ---
    const handleScoreChanged = (points: number) => {
      addScore(points);
      
      // Update target score daily quest
      const currentTotalScore = useGameStore.getState().score;
      updateQuestProgress('target_score', currentTotalScore, true); // set absolute value

      // Check for Puzzle Master Achievement (10k score)
      if (currentTotalScore >= 10000) {
        unlockAchievement('puzzle_master');
      }
    };

    const handleComboChanged = (comboVal: number) => {
      setCombo(comboVal);
    };

    const handleBlocksRemoved = (count: number) => {
      addBlocksCleared(count);
      
      // Update daily quests progress
      updateQuestProgress('blocks_removed', count);
      updateQuestProgress('single_group', count); // handles max single group internally
    };

    const handleGameOver = () => {
      endGame();
      
      // Progress daily play games quest
      updateQuestProgress('games_played', 1);

      // First game completed achievement
      unlockAchievement('first_game');

      // Check Loyal Player Achievement (10 total games played)
      const gamesPlayed = storageService.getStats().gamesPlayed['collapse'] || 0;
      if (gamesPlayed >= 10) {
        unlockAchievement('loyal_player');
      }
    };

    const handleAchievementTrigger = (id: string) => {
      unlockAchievement(id);
    };

    gameEventBus.on('score:changed', handleScoreChanged);
    gameEventBus.on('combo:changed', handleComboChanged);
    gameEventBus.on('blocks:removed', handleBlocksRemoved);
    gameEventBus.on('game:over', handleGameOver);
    gameEventBus.on('achievement:trigger', handleAchievementTrigger);

    // Clean up
    return () => {
      resizeObserver.disconnect();
      gameEventBus.off('score:changed', handleScoreChanged);
      gameEventBus.off('combo:changed', handleComboChanged);
      gameEventBus.off('blocks:removed', handleBlocksRemoved);
      gameEventBus.off('game:over', handleGameOver);
      gameEventBus.off('achievement:trigger', handleAchievementTrigger);

      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [mode, addScore, setCombo, addBlocksCleared, endGame, unlockAchievement, updateQuestProgress]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/60 flex items-center justify-center">
      {/* Canvas container div */}
      <div 
        ref={gameContainerRef} 
        className="game-canvas-container relative w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] flex items-center justify-center"
      />
    </div>
  );
};
