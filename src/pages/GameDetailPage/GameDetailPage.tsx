import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGameById } from '../../game-registry/gameRegistry';
import { Trophy, Play, Info, Keyboard, Sparkles, Clock, Zap, Award } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';

export const GameDetailPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = getGameById(gameId || '');

  const [selectedMode, setSelectedMode] = useState<string>('classic');

  if (!game || game.status !== 'available') {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Oyun Bulunamadı</h2>
        <p className="text-slate-400 mt-2">Aradığınız oyun aktif değil ya da mevcut değil.</p>
        <Link to="/" className="text-violet-400 hover:underline mt-4 inline-block">Ana Sayfaya Dön</Link>
      </div>
    );
  }

  // Get highscores for each mode
  const highScores = game.modes.reduce((acc, mode) => {
    acc[mode] = storageService.getHighScore(game.id, mode);
    return acc;
  }, {} as Record<string, number>);

  const handlePlay = () => {
    // Navigate to PlayGamePage with the selected mode as a query param
    navigate(`/play/${game.route}?mode=${selectedMode}`);
  };

  const modeDescriptions: Record<string, { title: string; desc: string; icon: any }> = {
    classic: {
      title: 'Klasik Mod',
      desc: 'Hamle sınırınız yoktur. Tahta başlangıçta doludur, yeni blok gelmez. Tahtada patlatacak en az 2 bitişik aynı renk blok kalmadığında oyun sona erer. Hedefiniz maksimum skor!',
      icon: Trophy,
    },
    time: {
      title: 'Süreli Mod',
      desc: 'Tam 60 saniyeniz var. Blok patlattıkça patlayan blok miktarına göre ek süre bonusları kazanırsınız. Süre sıfırlandığında oyun biter.',
      icon: Clock,
    },
    arcade: {
      title: 'Arcade Modu',
      desc: 'Alttan sürekli yeni blok satırları yükselir. Bloklar tahtanın en üst sınırını (tavanını) geçerse ve 7 saniye içinde o eşik temizlenmezse kaybedersiniz. Hızlı olun ve seviyeleri aşın!',
      icon: Zap,
    },
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link to="/games" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
        &larr; Oyunlar Listesine Dön
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Game Cover & Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative rounded-3xl overflow-hidden aspect-video border border-slate-900 shadow-2xl">
            <img 
              src={game.thumbnail} 
              alt={game.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%230f172a'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23475569'>Game Preview</text></svg>";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{game.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {game.categories.map(c => (
                  <span key={c} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-400">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-violet-500" />
              <span>Oyun Hakkında</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* How to Play / Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <Keyboard className="h-5 w-5 text-violet-500" />
                <span>Kontroller</span>
              </h3>
              <ul className="text-sm text-slate-400 space-y-2 leading-relaxed">
                <li>
                  <strong className="text-slate-200">Masaüstü:</strong> Farenizi (Mouse) blokların üzerinde gezdirerek grupları vurgulayın. Gruba tıklayarak patlatın.
                </li>
                <li>
                  <strong className="text-slate-200">Mobil:</strong> Herhangi bir bloğa dokunarak grubu seçin, aynı bloğa tekrar dokunarak (veya dokunmaya devam ederek) patlatın.
                </li>
              </ul>
            </div>

            <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span>Puanlama Formülü</span>
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Puanlar, patlatılan grup boyutunun karesine bağlıdır: <br />
                <code className="text-amber-400 font-mono block mt-1.5 p-1 bg-slate-950 border border-slate-900 rounded text-center">
                  puan = grupBoyutu × grupBoyutu × 10
                </code>
                Büyük grupları patlatmak çok daha fazla puan kazandırır!
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Mode Selection & Play Panel */}
        <div className="space-y-6">
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold border-b border-slate-900 pb-3">Oyun Modunu Seç</h2>

            <div className="space-y-3">
              {game.modes.map((mode) => {
                const cfg = modeDescriptions[mode];
                const ModeIcon = cfg ? cfg.icon : Trophy;
                const score = highScores[mode] || 0;
                
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                      selectedMode === mode
                        ? 'bg-violet-600/10 border-violet-500 shadow-md shadow-violet-500/5'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${selectedMode === mode ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <ModeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-bold text-sm block text-white">
                            {cfg ? cfg.title : mode.toUpperCase()}
                          </span>
                          {score > 0 && (
                            <span className="text-[10px] text-amber-400 font-bold block">
                              Rekor: {score.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${selectedMode === mode ? 'border-violet-500' : 'border-slate-700'}`}>
                        {selectedMode === mode && <div className="h-2 w-2 rounded-full bg-violet-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mode Description Box */}
            {selectedMode && modeDescriptions[selectedMode] && (
              <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-xs sm:text-sm text-slate-400 leading-relaxed">
                {modeDescriptions[selectedMode].desc}
              </div>
            )}

            {/* Play Button */}
            <button
              onClick={handlePlay}
              className="w-full inline-flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-violet-600/20 hover:scale-102 transition-all duration-300"
            >
              <span>Oyunu Başlat</span>
              <Play className="h-4 w-4 fill-current" />
            </button>
          </div>

          {/* High Scores summary widget */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 border-b border-slate-900 pb-3">
              <Award className="h-5 w-5 text-amber-400" />
              <span>En Yüksek Skorlarınız</span>
            </h3>

            <div className="space-y-3 text-sm">
              {game.modes.map((mode) => {
                const title = modeDescriptions[mode]?.title || mode;
                const score = highScores[mode] || 0;
                return (
                  <div key={mode} className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-900">
                    <span className="text-slate-400 font-semibold">{title}</span>
                    <span className="font-bold text-amber-400 font-mono">{score.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
