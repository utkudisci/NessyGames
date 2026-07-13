import React from 'react';
import { GameCard } from '../../components/game-card/GameCard';
import { gameRegistry } from '../../game-registry/gameRegistry';
import { Gamepad2 } from 'lucide-react';

export const GamesPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-violet-500" />
          <span>Tüm Oyunlar</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-xl">
          Platformumuzda yayınlanan tüm oyunları buradan inceleyebilirsiniz. Yeni oyunlar ve güncellemeler için takipte kalın!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gameRegistry.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};
