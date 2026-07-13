import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass border-t border-slate-900 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
              <img src="/assets/images/nessy_logo.png" alt="NessyGames Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold font-sans tracking-wide text-white">
              NessyGames
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <Link to="/" className="hover:text-violet-400 transition-colors">Ana Sayfa</Link>
            <Link to="/games" className="hover:text-violet-400 transition-colors">Oyunlar</Link>
            <Link to="/leaderboard" className="hover:text-violet-400 transition-colors">Skorlar</Link>
            <Link to="/settings" className="hover:text-violet-400 transition-colors">Ayarlar</Link>
          </div>

          {/* Copyright / Info */}
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" />
              <span>by Utku Dişci</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-900 pt-6 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} NessyGames. Tüm hakları saklıdır. Phaser 3 & React ile güçlendirilmiştir.
        </div>
      </div>
    </footer>
  );
};
