import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Trophy, Settings, Sun, Moon, Volume2, VolumeX, Menu, X, Award } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useQuestStore } from '../../stores/useQuestStore';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const { theme, setTheme, isMuted, setIsMuted } = useSettingsStore();
  const { quests } = useQuestStore();

  const completedQuests = quests.filter(q => q.isCompleted).length;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: '/', label: 'Ana Sayfa', icon: Gamepad2 },
    { to: '/games', label: 'Oyunlar', icon: Gamepad2 },
    { to: '/leaderboard', label: 'Skorlar', icon: Trophy },
    { to: '/settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-slate-900 rounded-xl shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden flex items-center justify-center border border-slate-800">
                <img src="/assets/images/nessy_logo.png" alt="NessyGames Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold font-sans tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-violet-400 group-hover:text-violet-300 transition-colors">
                NessyGames
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Daily Quest Status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold">
              <Award className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-slate-400">Görevler:</span>
              <span className="text-amber-400">{completedQuests}/{quests.length}</span>
            </div>

            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              title="Tema Değiştir"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-violet-400" />}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            {/* Mute Button (Mobile) */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
            </button>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-2 pt-2 pb-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-2 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  active
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-4 pb-2 border-t border-slate-900 px-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Görevler: {completedQuests}/{quests.length}</span>
            </div>
            
            <button
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark');
                setIsOpen(false);
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-400 bg-slate-900 rounded-lg hover:text-white"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Açık Tema</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-violet-400" />
                  <span>Koyu Tema</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
