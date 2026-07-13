import React, { useState } from 'react';
import { Trophy, Medal, Clock, Zap, Target } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string;
  isUser: boolean;
}

export const LeaderboardPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<string>('classic');

  // Load user's high scores dynamically
  const userClassicHighScore = storageService.getHighScore('collapse', 'classic');
  const userTimeHighScore = storageService.getHighScore('collapse', 'time');
  const userArcadeHighScore = storageService.getHighScore('collapse', 'arcade');

  // Mock global leaderboard mixed with user's actual highscore
  const getLeaderboardData = (mode: string): LeaderboardEntry[] => {
    let userScore = 0;
    if (mode === 'classic') userScore = userClassicHighScore;
    if (mode === 'time') userScore = userTimeHighScore;
    if (mode === 'arcade') userScore = userArcadeHighScore;

    const baseEntries = [
      { name: 'KozmosGamer', score: mode === 'classic' ? 18450 : mode === 'time' ? 9820 : 25100, date: '2026-07-11', isUser: false },
      { name: 'NeonPatlatıcı', score: mode === 'classic' ? 14200 : mode === 'time' ? 8400 : 19300, date: '2026-07-12', isUser: false },
      { name: 'GravityMaster', score: mode === 'classic' ? 11050 : mode === 'time' ? 7100 : 14900, date: '2026-07-10', isUser: false },
      { name: 'PuzzleBükücü', score: mode === 'classic' ? 7600 : mode === 'time' ? 5200 : 9200, date: '2026-07-13', isUser: false },
      { name: 'BlokKırıcı', score: mode === 'classic' ? 4500 : mode === 'time' ? 3100 : 5400, date: '2026-07-09', isUser: false },
    ];

    // Insert user into correct position based on score
    const userEntry: LeaderboardEntry = {
      rank: 0,
      name: 'Siz (Oyuncu)',
      score: userScore,
      date: new Date().toISOString().split('T')[0],
      isUser: true
    };

    const allEntries = [...baseEntries];
    
    // Add user entry if they have a score or if we want to show them on the board
    allEntries.push(userEntry);

    // Sort by score descending
    allEntries.sort((a, b) => b.score - a.score);

    // Assign rank numbers and filter duplicate user entries if necessary (shouldn't be any)
    return allEntries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));
  };

  const currentLeaderboard = getLeaderboardData(activeMode);

  const modes = [
    { id: 'classic', label: 'Klasik Mod', icon: Trophy, color: 'text-amber-400' },
    { id: 'time', label: 'Süreli Mod', icon: Clock, color: 'text-blue-400' },
    { id: 'arcade', label: 'Arcade Modu', icon: Zap, color: 'text-violet-400' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="border-b border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400 animate-pulse" />
            <span>Liderlik Tablosu</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Collapse oyunundaki en yüksek skorları mod bazında inceleyin. Kendi rekorunuzu kırıp zirveye yerleşin!
          </p>
        </div>

        {/* Mode Selector Tab */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-fit">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id)}
                className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                  active 
                    ? 'bg-slate-950 border border-slate-800 text-white shadow-md shadow-black/40' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${m.color}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-premium border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-900/35 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="px-6 py-4 text-center w-20">Sıra</th>
                <th className="px-6 py-4">Oyuncu Adı</th>
                <th className="px-6 py-4">Skor</th>
                <th className="px-6 py-4 text-right">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {currentLeaderboard.map((entry) => {
                let rankStyle = "text-slate-400 bg-slate-900/50";
                let rankIcon = null;

                if (entry.rank === 1) {
                  rankStyle = "text-amber-500 bg-amber-500/10 font-extrabold border border-amber-500/20";
                  rankIcon = <Medal className="h-5 w-5 text-amber-500 animate-bounce" />;
                } else if (entry.rank === 2) {
                  rankStyle = "text-slate-300 bg-slate-300/10 font-bold border border-slate-300/20";
                  rankIcon = <Medal className="h-4 w-4 text-slate-300" />;
                } else if (entry.rank === 3) {
                  rankStyle = "text-amber-700 bg-amber-700/10 font-semibold border border-amber-700/20";
                  rankIcon = <Medal className="h-4 w-4 text-amber-700" />;
                }

                return (
                  <tr 
                    key={`${entry.name}-${entry.rank}`}
                    className={`border-b border-slate-900/55 transition-colors duration-200 ${
                      entry.isUser 
                        ? 'bg-violet-600/10 hover:bg-violet-600/15 border-l-4 border-l-violet-500' 
                        : 'hover:bg-slate-900/20'
                    }`}
                  >
                    <td className="px-6 py-4 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        {rankIcon}
                        <span className={`px-2 py-0.5 rounded text-xs ${rankIcon ? 'font-bold' : rankStyle}`}>
                          #{entry.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-sm">
                      <div className="flex items-center gap-2">
                        <span className={entry.isUser ? 'text-violet-400 font-extrabold' : 'text-slate-200'}>
                          {entry.name}
                        </span>
                        {entry.isUser && (
                          <span className="text-[9px] font-extrabold tracking-wider bg-violet-600/30 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full uppercase">
                            Siz
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold text-sm ${entry.rank === 1 ? 'text-amber-400' : 'text-slate-100'}`}>
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                      {entry.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-violet-950/10 border border-violet-500/20 rounded-2xl flex items-start gap-3">
        <Target className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-300/80 leading-relaxed">
          Skorlarınızı yükseltmek için oyunda daha büyük blok gruplarını patlatmaya çalışın. Unutmayın, puanlar grup büyüklüğünün karesiyle artar, bu yüzden büyük kombolar ve gruplar oluşturmak liderlik tablosunda yükselmenin anahtarıdır!
        </p>
      </div>
    </div>
  );
};
