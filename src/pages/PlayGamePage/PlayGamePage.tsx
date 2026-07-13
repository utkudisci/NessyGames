import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getGameById } from '../../game-registry/gameRegistry';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Home, 
  Share2, Award, Zap, Clock, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { audioService } from '../../services/audio/audioService';
import { gameEventBus } from '../../games/collapse/utils/eventBus';

export const PlayGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const game = getGameById(gameId || '');
  const mode = searchParams.get('mode') || 'classic';

  const [shareCopied, setShareCopied] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [arcadeTimerProgress, setArcadeTimerProgress] = useState(0);
  const [arcadeDangerProgress, setArcadeDangerProgress] = useState(0);
  const [showPerfectClean, setShowPerfectClean] = useState(false);
  const [comboProgress, setComboProgress] = useState(0);

  // Store bindings
  const {
    status, score, highScore, combo, timeLeft, level, 
    blocksCleared, movesMade, biggestGroup,
    startGame, pauseGame, resumeGame, tickTime, addTimeBonus, resetGame
  } = useGameStore();

  const { isMuted, setIsMuted } = useSettingsStore();

  // 1. Initialize Game Session
  useEffect(() => {
    if (game) {
      startGame(game.id, mode);
    }
    return () => {
      resetGame();
    };
  }, [game, mode, startGame, resetGame]);

  // 1.5. Event Bus Listeners for HUD Indicators & Special Effects
  useEffect(() => {
    const handleTimerProgress = (p: number) => setArcadeTimerProgress(p);
    const handleDangerProgress = (p: number) => setArcadeDangerProgress(p);
    const handleComboProgress = (p: number) => setComboProgress(p);
    const handlePerfectClean = () => {
      setShowPerfectClean(true);
      setTimeout(() => setShowPerfectClean(false), 3000);
    };

    gameEventBus.on('arcade:timer:progress', handleTimerProgress);
    gameEventBus.on('arcade:danger:progress', handleDangerProgress);
    gameEventBus.on('combo:timer:progress', handleComboProgress);
    gameEventBus.on('perfect:clean', handlePerfectClean);

    return () => {
      gameEventBus.off('arcade:timer:progress', handleTimerProgress);
      gameEventBus.off('arcade:danger:progress', handleDangerProgress);
      gameEventBus.off('combo:timer:progress', handleComboProgress);
      gameEventBus.off('perfect:clean', handlePerfectClean);
    };
  }, []);

  // 2. Timer countdown effect for Time Mode
  useEffect(() => {
    let intervalId: any = null;

    if (mode === 'time' && status === 'playing') {
      intervalId = setInterval(() => {
        tickTime();
        
        // If time reaches 0, trigger Game Over (handled by tickTime state check or below)
        const currentStoreTime = useGameStore.getState().timeLeft;
        if (currentStoreTime <= 0) {
          useGameStore.getState().endGame();
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, status, tickTime]);

  // 3. Time bonus side-effect (When blocksCleared/movesMade changes, reward time in time mode)
  useEffect(() => {
    if (mode === 'time' && status === 'playing' && biggestGroup > 0) {
      // Reward time based on the last cleared block group size
      const reward = Math.max(0, Math.floor(biggestGroup / 3.5));
      if (reward > 0) {
        addTimeBonus(reward);
      }
    }
  }, [biggestGroup, movesMade, mode, status, addTimeBonus]);

  if (!game || game.status !== 'available') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Oyun Bulunamadı</h2>
        <Link to="/" className="text-violet-400 hover:underline">Ana Sayfaya Dön</Link>
      </div>
    );
  }

  const handleRestart = () => {
    resetGame();
    startGame(game.id, mode);
    setSessionKey(prev => prev + 1);
  };

  const handleShare = () => {
    const text = `🏆 NessyGames - ${game.title} [${mode.toUpperCase()}] modunda ${score} skor elde ettim! Rekorum: ${highScore}. Sen de katıl ve oyna!`;
    navigator.clipboard.writeText(text).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };

  const GameComponent = game.component;

  return (
    <div className="space-y-6">
      {/* Top Header bar */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center space-x-3">
          <Link to={`/games/${game.id}`} className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">
            &larr; Detaylara Dön
          </Link>
          <span className="text-slate-700">|</span>
          <span className="text-xs sm:text-sm text-violet-400 font-bold uppercase tracking-wider">
            {mode === 'classic' ? 'Klasik Mod' : mode === 'time' ? 'Süreli Mod' : 'Arcade Modu'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Pause Toggle */}
          {status === 'playing' && (
            <button
              onClick={() => {
                audioService.playClick();
                pauseGame();
              }}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Oyunu Duraklat"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}

          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Sesi Aç' : 'Sessiz'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          {/* Debug CLEAN & PERFECT CLEAN Test Button */}
          <button
            onClick={() => {
              gameEventBus.emit('debug:set:clean-state');
            }}
            className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors"
            title="CLEAN & PERFECT CLEAN Testini Başlat (Tahtada sadece 2 kırmızı blok bırakır)"
          >
            DEBUG TEST
          </button>

          {/* Debug Combo x45 Button */}
          <button
            onClick={() => {
              gameEventBus.emit('debug:set:combo-45');
            }}
            className="px-3 py-2 bg-purple-500/20 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-500/30 transition-colors"
            title="Komboyu 45 yapar"
          >
            DEBUG COMBO 45
          </button>
        </div>
      </div>

      {/* Main Grid: Game area and HUD */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Game Canvas Wrapper */}
        <div className="flex-grow min-w-0 order-2 lg:order-1 min-h-[400px] flex items-center justify-center relative group">
          <GameComponent key={sessionKey} mode={mode} />

          {/* Perfect Clean CSS Confetti Overlay (Rendered on top of canvas) */}
          {showPerfectClean && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-30 bg-transparent">
              {Array.from({ length: 65 }).map((_, i) => {
                const style = {
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  backgroundColor: ['#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#ff2d55'][i % 8],
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${1.2 + Math.random() * 1.5}s`,
                };
                return (
                  <div
                    key={i}
                    className="absolute w-2 h-4 rounded-sm animate-confetti-fall"
                    style={style}
                  />
                );
              })}
            </div>
          )}

          {/* Floating Slanted Combo Widget */}
          {combo > 1 && comboProgress > 0 && (
            <div className={`absolute top-4 right-4 z-10 pointer-events-none p-3 rounded-2xl glass-premium border border-violet-500/30 flex items-center gap-3 shadow-xl transition-all duration-300 transform -rotate-12 ${
              comboProgress < 0.35 ? 'animate-shake border-red-500/40 shadow-red-500/10' : 'shadow-violet-500/10'
            }`}>
              {/* Slanted text info */}
              <div className="text-left select-none">
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block">KOMBO SERİSİ</span>
                <span className={`text-2xl font-black italic block leading-none transition-all duration-100 ${
                  comboProgress < 0.35 ? 'text-red-400 font-extrabold animate-pulse' : 'text-white'
                }`}>
                  X{combo}
                </span>
              </div>
              
              {/* Circular SVG Timer */}
              <div className="relative h-12 w-12 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                  {/* Gray background track */}
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className="stroke-slate-800/40 fill-none"
                    strokeWidth="3.5"
                  />
                  {/* Colored progress line */}
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    className={`fill-none transition-all duration-75 ease-linear ${
                      comboProgress < 0.35 ? 'stroke-red-500' : 'stroke-violet-500'
                    }`}
                    strokeWidth="3.5"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 * (1 - comboProgress)}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center visual: countdown timer */}
                <div className={`text-[10px] font-black font-mono relative z-10 transition-all ${
                  comboProgress < 0.35 ? 'text-red-400 animate-pulse' : 'text-violet-400'
                }`}>
                  {Math.max(0.1, comboProgress * 2.2).toFixed(1)}s
                </div>
              </div>
            </div>
          )}

          {/* Pause Overlay screen */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-20 space-y-6">
              <div className="p-4 bg-violet-600/10 border border-violet-500/30 rounded-full animate-pulse">
                <Pause className="h-10 w-10 text-violet-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">Oyun Duraklatıldı</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    audioService.playClick();
                    resumeGame();
                  }}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/25 transition-all flex items-center space-x-2"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Devam Et</span>
                </button>
                <button
                  onClick={handleRestart}
                  className="px-5 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Yeniden Başlat
                </button>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {status === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-20 p-6 text-center animate-fade-in">
              <div className="absolute top-0 w-full h-full bg-radial-gradient from-violet-900/10 to-transparent pointer-events-none" />

              <div className="space-y-6 max-w-sm w-full z-10">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs uppercase tracking-widest rounded-full">
                  <span>OYUN BİTTİ</span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Toplam Skor</span>
                  <h2 className="text-5xl font-extrabold text-white tracking-tight text-gradient">
                    {score.toLocaleString()}
                  </h2>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-900/60 border border-slate-900 rounded-2xl text-left text-xs sm:text-sm">
                  <div className="p-2 border-r border-slate-800">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">En Yüksek</span>
                    <span className="font-extrabold text-amber-400">{highScore.toLocaleString()}</span>
                  </div>
                  <div className="p-2 pl-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Hamle Sayısı</span>
                    <span className="font-extrabold text-white">{movesMade}</span>
                  </div>
                  <div className="p-2 border-r border-slate-800 border-t">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Patlatılan Blok</span>
                    <span className="font-extrabold text-white">{blocksCleared}</span>
                  </div>
                  <div className="p-2 pl-3 border-t">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">En Büyük Grup</span>
                    <span className="font-extrabold text-violet-400">{biggestGroup}</span>
                  </div>
                </div>

                {/* Buttons controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="flex-grow inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-violet-600/10 hover:scale-102 transition-all duration-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Yeniden Oyna</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center space-x-2 px-5 py-3.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-xl transition-all"
                  >
                    {shareCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        <span>Paylaş</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-900/60">
                  <Link 
                    to={`/games/${game.id}`} 
                    className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Oyun Detay Ekranına Git &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Portal HUD Stats */}
        <div className="w-full lg:w-80 order-1 lg:order-2 flex flex-col justify-between space-y-6">
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-6 flex-grow">
            <h2 className="text-lg font-bold border-b border-slate-900 pb-3 text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-500" />
              <span>Oyun Paneli (HUD)</span>
            </h2>

            {/* Score, Combo & Record */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl grid grid-cols-3 gap-2 items-center text-center">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Skor</span>
                  <span className="text-2xl font-black text-white font-mono tracking-tight">
                    {score}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-x border-slate-800/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block leading-none">Kombo</span>
                  <span className={`text-xl font-black font-mono transition-all duration-300 mt-1.5 ${
                    combo > 1 
                      ? 'text-amber-400 animate-bounce-subtle' 
                      : 'text-slate-700'
                  }`}>
                    x{combo}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Rekor</span>
                  <span className="text-sm font-extrabold text-amber-400 font-mono">
                    {Math.max(highScore, score)}
                  </span>
                </div>
              </div>

              {/* Mode Specific display */}
              {mode === 'time' && (
                <div className={`p-4 border rounded-2xl flex items-center justify-between transition-colors ${
                  timeLeft <= 10 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' 
                    : 'bg-slate-900 border-slate-850 text-white'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block leading-none">Kalan Süre</span>
                      <span className="text-xl font-extrabold font-mono">{timeLeft}s</span>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'arcade' && (
                <div className="space-y-4">
                  {/* Stats badge */}
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between text-white">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-violet-400 animate-bounce" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block leading-none">Arcade Seviye</span>
                        <span className="text-xl font-extrabold font-mono">Lv. {level}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Hız Çarpanı</span>
                      <span className="text-xs font-mono text-violet-400 font-bold">
                        x{Math.min(2.5, 1 + (level - 1) * 0.1).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Next row progress indicator */}
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl space-y-2 text-white">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                      <span>Yeni Satır</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-100 ease-out shadow-lg shadow-violet-500/20"
                        style={{ width: `${arcadeTimerProgress * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Tavan Tehlikesi / Durumu meter */}
                  <div className={`p-4 border rounded-2xl space-y-2 text-white transition-all duration-300 ${
                    arcadeDangerProgress > 0 
                      ? 'bg-red-950/10 border-red-500/20 animate-pulse' 
                      : 'bg-slate-900 border-slate-850'
                  }`}>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      {arcadeDangerProgress > 0 ? (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-bounce" />
                          <span>Tavan Tehlikesi!</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                          <span>Tavan Durumu</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="h-2.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-100 ease-out ${
                          arcadeDangerProgress > 0 
                            ? 'bg-gradient-to-r from-red-600 to-orange-500 shadow-lg shadow-red-500/50' 
                            : 'bg-emerald-500/30'
                        }`}
                        style={{ width: arcadeDangerProgress > 0 ? `${arcadeDangerProgress * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* General Play Stats */}
            <div className="space-y-3 pt-4 border-t border-slate-900">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400 font-medium">Toplam Hamle</span>
                <span className="font-bold text-white font-mono">{movesMade}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400 font-medium">Patlatılan Blok</span>
                <span className="font-bold text-white font-mono">{blocksCleared}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400 font-medium">En Büyük Tek Hamle</span>
                <span className="font-bold text-violet-400 font-mono">{biggestGroup}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-4 flex justify-between gap-3 text-center">
            <button
              onClick={handleRestart}
              className="flex-grow py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Yeniden Başlat</span>
            </button>
            <Link
              to="/"
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center"
              title="Ana Menüye Dön"
            >
              <Home className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* Confetti styles are defined below in the style tag */}

      {/* Styled css for animations inside HUD */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 1.5s infinite ease-in-out;
        }
        @keyframes pulseSubtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.88; }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 1s infinite ease-in-out;
        }
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(-12deg); }
          20%, 60% { transform: translate(-2px, 1px) rotate(-13deg); }
          40%, 80% { transform: translate(2px, -1px) rotate(-11deg); }
        }
        .animate-shake {
          animation: shake 0.15s infinite ease-in-out;
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confettiFall 2s linear forwards;
        }
      `}</style>
    </div>
  );
};
