import React from 'react';
import { Link } from 'react-router-dom';
import type { GameMetadata } from '../../game-registry/gameTypes';
import { Play, Calendar, Trophy } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';

interface GameCardProps {
  game: GameMetadata;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const isAvailable = game.status === 'available';
  const highScore = isAvailable && game.highScoreSupported 
    ? storageService.getHighScore(game.id, 'classic') 
    : 0;

  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden glass-premium border border-slate-900 transition-all duration-300 ${
        isAvailable 
          ? 'hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-600/5 hover:-translate-y-1' 
          : 'opacity-75'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        {isAvailable ? (
          <img 
            src={game.thumbnail} 
            alt={game.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fail-safe default placeholder using HTML5 Canvas style representation in case image isn't loaded
              e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%230f172a'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23475569'>Game Preview</text></svg>";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 p-4 text-center">
            <Calendar className="h-10 w-10 text-slate-500 mb-2 animate-bounce" />
            <span className="text-sm font-semibold text-slate-400">Çok Yakında</span>
          </div>
        )}
        
        {/* Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

        {/* Categories Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {game.categories.map((tag) => (
            <span 
              key={tag} 
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isAvailable ? (
            <span className="flex items-center space-x-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>AKTİF</span>
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
              YAKINDA
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col justify-between min-h-[160px]">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
            {game.title}
          </h3>
          <p className="text-slate-400 text-sm mt-1.5 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-900/60 flex items-center justify-between">
          {/* Top Score */}
          {isAvailable && highScore > 0 ? (
            <div className="flex items-center space-x-1.5 text-xs text-amber-400">
              <Trophy className="h-4 w-4" />
              <div>
                <span className="text-[10px] text-slate-500 block leading-none">REKOR</span>
                <span className="font-bold">{highScore.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {isAvailable ? 'Henüz Oynanmadı' : 'Geliştiriliyor'}
            </div>
          )}

          {/* Action Button */}
          {isAvailable ? (
            <Link 
              to={`/games/${game.route}`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-violet-600/10 group-hover:shadow-violet-600/20 group-hover:scale-105 transition-all duration-300"
            >
              <span>Detaylar</span>
              <Play className="h-3.5 w-3.5 fill-current" />
            </Link>
          ) : (
            <button 
              disabled
              className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-xl cursor-not-allowed"
            >
              Beklemede
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
