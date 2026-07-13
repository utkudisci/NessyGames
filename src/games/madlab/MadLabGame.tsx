import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { MadLabScene } from './scenes/MadLabScene';
import { madlabEventBus } from './utils/madlabEventBus';
import { madlabAudio } from './utils/madlabAudio';
import { 
  generateSolvableLevel, 
  solvePuzzle, 
  cloneTubes 
} from './core/MadLabEngine';
import type { TubeState } from './core/MadLabTypes';
import { MADLAB_DIFFICULTIES } from './config/madlabConfig';
import { useAchievementStore } from '../../stores/useAchievementStore';
import { useQuestStore } from '../../stores/useQuestStore';
import { storageService } from '../../services/storage/storageService';
import { 
  RotateCcw, Undo, Lightbulb, Play, Star,
  Trophy, Calendar, Sparkles, Home, ChevronRight
} from 'lucide-react';

interface MadLabGameProps {
  mode: string;
}

export const MadLabGame: React.FC<MadLabGameProps> = ({ mode }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  // Local React game states
  const [currentTubes, setCurrentTubes] = useState<TubeState[]>([]);
  const [initialTubes, setInitialTubes] = useState<TubeState[]>([]);
  const [undoStack, setUndoStack] = useState<TubeState[][]>([]);
  const [movesCount, setMovesCount] = useState(0);
  const [optimalMoves, setOptimalMoves] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gamePlayStatus, setGamePlayStatus] = useState<'lobby' | 'playing' | 'completed'>('lobby');
  
  // High scores & Campaign progress
  const [completedLevels, setCompletedLevels] = useState<Record<number, number>>({}); // level -> stars
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  const currentTubesRef = useRef<TubeState[]>([]);

  useEffect(() => {
    currentTubesRef.current = currentTubes;
  }, [currentTubes]);

  const { unlockAchievement } = useAchievementStore();
  const { updateQuestProgress } = useQuestStore();

  // Load progress from LocalStorage on mount
  useEffect(() => {
    const rawProgress = localStorage.getItem('nessygames_madlab_campaign');
    if (rawProgress) {
      try {
        setCompletedLevels(JSON.parse(rawProgress));
      } catch (e) {}
    }
  }, []);

  // Timer Effect
  useEffect(() => {
    if (gamePlayStatus === 'playing') {
      const interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [gamePlayStatus]);

  // Determine difficulty level parameters based on level number
  const getDifficultyForLevel = (levelNum: number) => {
    if (levelNum <= 3) return MADLAB_DIFFICULTIES.easy;
    if (levelNum <= 10) return MADLAB_DIFFICULTIES.medium;
    if (levelNum <= 20) return MADLAB_DIFFICULTIES.hard;
    return MADLAB_DIFFICULTIES.expert;
  };

  const getDifficultyNameForLevel = (levelNum: number) => {
    if (levelNum <= 3) return 'Kolay';
    if (levelNum <= 10) return 'Orta';
    if (levelNum <= 20) return 'Zor';
    return 'Uzman';
  };

  // Start a specific level
  const startLevel = (levelNum: number) => {
    const difficulty = getDifficultyForLevel(levelNum);
    
    let levelTubes: TubeState[];
    if (mode === 'daily') {
      levelTubes = generateSolvableLevel(difficulty);
    } else {
      levelTubes = generateSolvableLevel(difficulty);
    }

    // Run solver once to determine optimal path length
    const solution = solvePuzzle(levelTubes);
    const optimal = solution ? solution.length : 15;

    setInitialTubes(cloneTubes(levelTubes));
    setCurrentTubes(cloneTubes(levelTubes));
    setOptimalMoves(optimal);
    setMovesCount(0);
    setUndoStack([]);
    setTimer(0);
    setCurrentLevel(levelNum);
    setGamePlayStatus('playing');
  };

  useEffect(() => {
    if (gamePlayStatus === 'playing' && initialTubes.length > 0) {
      initializePhaser(initialTubes);
    }
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [gamePlayStatus, initialTubes]);

  const initializePhaser = (tubes: TubeState[]) => {
    // Destroy previous instance
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }

    if (!gameContainerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameContainerRef.current,
      backgroundColor: '#0b1329',
      transparent: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
      },
      scene: [
        {
          key: 'MadLabBoot',
          create: function(this: Phaser.Scene) {
            this.scene.start('MadLabScene', { tubes: cloneTubes(tubes) });
          }
        },
        MadLabScene
      ],
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;

    const resizeObserver = new ResizeObserver(() => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.scale.refresh();
      }
    });

    if (gameContainerRef.current) {
      resizeObserver.observe(gameContainerRef.current);
    }
  };

  // Register Event Bus listeners for Game events
  useEffect(() => {
    const handleMovesUpdated = () => {
      // Phaser finished a pour animation, update local counts and undo stack
      if (gameInstanceRef.current) {
        const scene = gameInstanceRef.current.scene.getScene('MadLabScene') as MadLabScene;
        // @ts-ignore - access inner tubesData
        const updatedTubes = cloneTubes(scene.tubesData);
        
        // Save current snapshot before updating
        setUndoStack(prev => [...prev, cloneTubes(currentTubesRef.current)]);
        setCurrentTubes(updatedTubes);
        setMovesCount(m => m + 1);
      }
    };

    const handleGameComplete = () => {
      setGamePlayStatus('completed');
      handleLevelCompletion();
    };

    const handleAudioPlay = (key: string) => {
      if (key === 'tube_select') madlabAudio.playTubeSelect();
      if (key === 'liquid_pour') madlabAudio.playLiquidPour();
      if (key === 'invalid_move') madlabAudio.playInvalidMove();
      if (key === 'level_success') madlabAudio.playLevelSuccess();
    };

    madlabEventBus.on('moves:updated', handleMovesUpdated);
    madlabEventBus.on('game:complete', handleGameComplete);
    madlabEventBus.on('audio:play', handleAudioPlay);

    return () => {
      madlabEventBus.off('moves:updated', handleMovesUpdated);
      madlabEventBus.off('game:complete', handleGameComplete);
      madlabEventBus.off('audio:play', handleAudioPlay);
    };
  }, []);

  // Handle score, achievements, daily progress, local storage on win
  const handleLevelCompletion = () => {
    // 1. Calculate Stars
    let starsEarned = 1;
    if (movesCount <= optimalMoves + 3) {
      starsEarned = 3;
    } else if (movesCount <= optimalMoves + 8) {
      starsEarned = 2;
    }

    // 2. Achievements
    unlockAchievement('madlab_first_sort');
    if (undoStack.length === 0) {
      unlockAchievement('madlab_no_undo');
    }
    if (starsEarned === 3) {
      unlockAchievement('madlab_perfect_stars');
    }
    if (getDifficultyNameForLevel(currentLevel) === 'Uzman') {
      unlockAchievement('madlab_expert_level');
    }

    // 3. Save progress
    const nextProgress = { ...completedLevels, [currentLevel]: Math.max(completedLevels[currentLevel] || 0, starsEarned) };
    setCompletedLevels(nextProgress);
    localStorage.setItem('nessygames_madlab_campaign', JSON.stringify(nextProgress));

    // 4. Update Stats & Quests
    storageService.updateStats('madlab', {
      blocksRemoved: 4, // 1 complete tube
      playTime: timer,
      gameCompleted: true
    });

    updateQuestProgress('games_played', 1);
    updateQuestProgress('blocks_removed', 4);
    updateQuestProgress('target_score', 1000);
  };

  // --- HUD ACTIONS ---

  const handleUndo = () => {
    if (gamePlayStatus !== 'playing' || undoStack.length === 0) return;
    madlabAudio.playTubeSelect();

    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setCurrentTubes(previousState);
    setMovesCount(m => Math.max(0, m - 1));

    // Sync to Phaser
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('MadLabScene') as MadLabScene;
      if (scene) scene.syncTubes(previousState);
    }
  };

  const handleRestart = () => {
    if (gamePlayStatus !== 'playing') return;
    madlabAudio.playTubeSelect();

    const cloned = cloneTubes(initialTubes);
    setCurrentTubes(cloned);
    setMovesCount(0);
    setUndoStack([]);

    // Sync to Phaser
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene('MadLabScene') as MadLabScene;
      if (scene) scene.syncTubes(cloned);
    }
  };

  const handleHint = () => {
    if (gamePlayStatus !== 'playing') return;
    madlabAudio.playHintUse();

    // Solve current state
    const solution = solvePuzzle(currentTubes);
    if (solution && solution.length > 0) {
      const nextBestMove = solution[0];
      
      // Animate selection outline in Phaser on source and target tubes
      if (gameInstanceRef.current) {
        const scene = gameInstanceRef.current.scene.getScene('MadLabScene') as MadLabScene;
        // Visual indicator on source and target
        // @ts-ignore
        scene.animateSelection(nextBestMove.fromTubeId, true);
        
        // Brief highlight then clear
        setTimeout(() => {
          if (gameInstanceRef.current) {
            const innerScene = gameInstanceRef.current.scene.getScene('MadLabScene') as MadLabScene;
            // @ts-ignore
            innerScene.animateSelection(nextBestMove.fromTubeId, false);
          }
        }, 1200);
      }
    } else {
      madlabAudio.playInvalidMove();
    }
  };

  const quitToLobby = () => {
    setGamePlayStatus('lobby');
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center select-none text-slate-100">
      
      {/* LOBBY VIEW */}
      {gamePlayStatus === 'lobby' && (
        <div className="w-full max-w-4xl p-6 flex flex-col gap-6 animate-fade-in">
          {/* Header Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 border border-slate-800 p-6 flex items-center justify-between overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                MadLab Kimya Laboratuvarı
              </h2>
              <p className="text-slate-400 mt-2 max-w-lg text-sm leading-relaxed">
                Dengesiz elementleri ve katalizörleri test tüplerinde gruplandırarak stabil hale getirin. Her tüpte yalnızca tek bir bileşik kalmalıdır!
              </p>
            </div>
            
            {mode === 'daily' ? (
              <div className="flex flex-col items-end gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 shadow-inner">
                <Calendar className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">GÜNLÜK MİSYON</span>
                <button 
                  onClick={() => startLevel(100)} // Seeded Level 100 for Daily
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <Play className="h-4 w-4 fill-white" /> Başla
                </button>
              </div>
            ) : null}
          </div>

          {/* Campaign Selection */}
          {mode !== 'daily' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold text-lg text-slate-300 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" /> Deney Aşamaları (Campaign)
                </span>
                <span className="text-xs text-slate-400">
                  Toplam Yıldız: {Object.values(completedLevels).reduce((a, b) => a + b, 0)} ⭐
                </span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {Array.from({ length: 30 }).map((_, i) => {
                  const levelNum = i + 1;
                  const stars = completedLevels[levelNum] || 0;
                  const isLocked = levelNum > 1 && !completedLevels[levelNum - 1];

                  return (
                    <button
                      key={levelNum}
                      disabled={isLocked}
                      onClick={() => startLevel(levelNum)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl border p-2 transition-all ${
                        isLocked 
                          ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 active:scale-95 cursor-pointer shadow-lg'
                      }`}
                    >
                      <span className="text-lg font-black">{levelNum}</span>
                      <span className="text-xs text-slate-500 mt-1 font-semibold">
                        {getDifficultyNameForLevel(levelNum)}
                      </span>
                      
                      {/* Star rating rendering */}
                      {!isLocked && (
                        <div className="flex gap-0.5 mt-2">
                          {[1, 2, 3].map(s => (
                            <Star 
                              key={s} 
                              className={`h-3.5 w-3.5 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAMEPLAY VIEW */}
      {gamePlayStatus === 'playing' && (
        <div className="w-full h-full flex flex-col flex-grow animate-fade-in">
          {/* HUD Header */}
          <div className="w-full flex items-center justify-between px-6 py-3 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={quitToLobby}
                className="p-2 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
                title="Lobiye Dön"
              >
                <Home className="h-4 w-4" />
              </button>
              <div>
                <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-widest">
                  SEVİYE {currentLevel} • {getDifficultyNameForLevel(currentLevel)}
                </span>
                <h3 className="text-sm font-bold text-slate-300">Compound Sorting</h3>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="flex items-center gap-8 bg-slate-900/60 border border-slate-800 rounded-2xl px-6 py-2">
              <div className="flex flex-col items-center">
                <span className="text-xxs uppercase tracking-wider text-slate-500">Hamleler</span>
                <span className="text-lg font-black text-white">{movesCount} <span className="text-xs text-slate-500 font-normal">/ {optimalMoves + 3} (3⭐)</span></span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-xxs uppercase tracking-wider text-slate-500">Süre</span>
                <span className="text-lg font-black text-emerald-400">
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="px-3 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-300 transition-colors disabled:opacity-40 disabled:hover:bg-slate-900"
                title="Geri Al"
              >
                <Undo className="h-3.5 w-3.5" /> Geri Al
              </button>
              <button 
                onClick={handleRestart}
                className="px-3 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-300 transition-colors"
                title="Yeniden Başlat"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Yeniden Başlat
              </button>
              <button 
                onClick={handleHint}
                className="px-3 py-2 border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-xl flex items-center gap-1.5 text-xs font-bold text-emerald-400 transition-colors"
                title="İpucu Göster"
              >
                <Lightbulb className="h-3.5 w-3.5" /> İpucu
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-grow w-full relative flex items-center justify-center overflow-hidden">
            <div 
              ref={gameContainerRef} 
              className="game-canvas-container relative w-full h-full min-h-[400px]"
            />
          </div>
        </div>
      )}

      {/* COMPLETED SUCCESS MODAL */}
      {gamePlayStatus === 'completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            
            <Sparkles className="h-12 w-12 text-emerald-400 animate-pulse mb-3" />
            
            <span className="text-xxs font-black text-emerald-400 uppercase tracking-widest">
              Deney Başarılı!
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
              Bileşik Ayrıştırıldı
            </h2>

            {/* Stars rating visualizer */}
            <div className="flex gap-2 my-6">
              {[1, 2, 3].map(s => {
                const earned = movesCount <= (optimalMoves + (s === 3 ? 3 : 8));
                return (
                  <Star 
                    key={s} 
                    className={`h-12 w-12 filter drop-shadow-lg transform transition-all duration-500 ${
                      earned 
                        ? 'fill-amber-400 text-amber-400 scale-110 rotate-12' 
                        : 'text-slate-800 scale-90'
                    }`} 
                  />
                );
              })}
            </div>

            {/* Completion stats */}
            <div className="w-full grid grid-cols-2 gap-4 bg-slate-950/40 border border-slate-900 rounded-2xl p-4 mb-6">
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500">Kullanılan Hamle</span>
                <span className="text-xl font-bold mt-1 text-white">{movesCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500">Bitirme Süresi</span>
                <span className="text-xl font-bold mt-1 text-emerald-400">
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="w-full flex gap-3">
              <button 
                onClick={quitToLobby}
                className="flex-1 py-3.5 border border-slate-800 bg-slate-900 hover:bg-slate-800 active:scale-95 text-sm font-bold rounded-2xl transition-all"
              >
                Lobiye Dön
              </button>
              
              {mode !== 'daily' && (
                <button 
                  onClick={() => startLevel(currentLevel + 1)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  Sonraki Seviye <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MadLabGame;
