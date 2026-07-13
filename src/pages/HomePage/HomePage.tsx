import React from 'react';
import { Link } from 'react-router-dom';
import { GameCard } from '../../components/game-card/GameCard';
import { gameRegistry } from '../../game-registry/gameRegistry';
import { useQuestStore } from '../../stores/useQuestStore';
import { Play, Sparkles, Trophy, Award, Gamepad2, Users } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';

export const HomePage: React.FC = () => {
  const { quests } = useQuestStore();
  const activeGames = gameRegistry.filter(g => g.status === 'available');
  const comingSoonGames = gameRegistry.filter(g => g.status === 'coming-soon');

  // Load highscore for Hero banner
  const collapseHighScore = storageService.getHighScore('collapse', 'classic');

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass-premium border border-slate-900/50 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center gap-10">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />

        <div className="flex-grow space-y-6 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>HAFTANIN ÖNE ÇIKAN OYUNU</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Yeni Nesil Puzzle <br />
            <span className="text-gradient">Collapse Puzzle</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Klasik, Süreli ve Arcade modlarıyla bağımlılık yaratan blok eşleştirme deneyimi. Aynı renkteki blokları bir araya getirin, komboları yakalayın ve rekorları alt üst edin!
          </p>

          {/* Quick stats / play */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              to="/games/collapse"
              className="inline-flex items-center justify-center space-x-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-violet-600/20 hover:scale-102 transition-all duration-300 w-full sm:w-auto"
            >
              <span>Hemen Oyna</span>
              <Play className="h-4 w-4 fill-current" />
            </Link>

            {collapseHighScore > 0 && (
              <div className="flex items-center space-x-2.5 px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl w-full sm:w-auto justify-center">
                <Trophy className="h-5 w-5 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none block">Rekor Skor</span>
                  <span className="text-sm font-extrabold text-amber-400">{collapseHighScore.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero visual */}
        <div className="w-full lg:w-[40%] aspect-video lg:aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative group flex items-center justify-center">
          <img 
            src="/assets/images/collapse_thumbnail.png" 
            alt="Collapse Banner"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='100%' height='100%' fill='%230f172a'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%23475569'>Collapse Game</text></svg>";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>
      </section>

      {/* Main Grid: Game List and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Games list */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-violet-500" />
              <span>Oyun Portalı</span>
            </h2>
            <Link to="/games" className="text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors">
              Tümünü Gör
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
            {comingSoonGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-8">
          {/* Daily Quests Panel */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white border-b border-slate-900 pb-3">
              <Award className="h-5 w-5 text-amber-400" />
              <span>Günlük Görevler</span>
            </h3>

            <div className="space-y-4">
              {quests.map((quest) => {
                const percent = Math.min(100, Math.round((quest.current / quest.target) * 100));
                return (
                  <div key={quest.id} className="space-y-2">
                    <div className="flex justify-between items-start text-xs sm:text-sm">
                      <span className={`font-semibold ${quest.isCompleted ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                        {quest.description}
                      </span>
                      <span className="text-slate-400 font-mono whitespace-nowrap ml-2">
                        {quest.current}/{quest.target}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          quest.isCompleted 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                            : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-slate-500 text-center">
              Görevler her gün otomatik olarak yenilenir.
            </p>
          </div>

          {/* Quick Platform Stats */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white border-b border-slate-900 pb-3">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Platform İstatistikleri</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Aktif Oyunlar</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">1</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Geliştirilenler</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">2</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center col-span-2">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Kazanılan Başarımlar</span>
                <span className="text-xl font-extrabold text-amber-400 mt-1 block">
                  {Object.keys(storageService.getAchievements()).length} / 6
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
