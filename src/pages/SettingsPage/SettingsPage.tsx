import React from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Volume2, VolumeX, Sun, Moon, RotateCcw, AlertTriangle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { 
    theme, setTheme,
    masterVolume, setMasterVolume,
    sfxVolume, setSfxVolume,
    musicVolume, setMusicVolume,
    isMuted, setIsMuted 
  } = useSettingsStore();

  const handleResetData = () => {
    if (window.confirm('Tüm oyun skorlarınızı, başarımlarınızı ve istatistiklerinizi sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="border-b border-slate-900 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <span>Sistem Ayarları</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Ses seviyelerini ayarlayın, portal temasını değiştirin veya oyun verilerinizi yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Audio settings */}
        <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-6">
          <h2 className="text-lg font-bold border-b border-slate-900 pb-3 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-violet-500" />
            <span>Ses Ayarları</span>
          </h2>

          <div className="space-y-5">
            {/* Master Volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-semibold">Ana Ses Seviyesi</span>
                <span className="text-slate-400 font-mono">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            {/* SFX Volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-semibold">Efekt Sesi (SFX)</span>
                <span className="text-slate-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            {/* Music Volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-semibold">Müzik Seviyesi</span>
                <span className="text-slate-400 font-mono">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            {/* Mute toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center space-x-3">
                {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-emerald-400" />}
                <div>
                  <span className="text-sm font-bold text-white block">Tüm Sesleri Sessize Al</span>
                  <span className="text-[10px] text-slate-500">Müzik ve efekt sesleri kesilir</span>
                </div>
              </div>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  isMuted ? 'bg-red-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    isMuted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* General Options & Data reset */}
        <div className="space-y-6">
          {/* Theme & Display */}
          <div className="glass-premium border border-slate-900 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-900 pb-3 flex items-center gap-2">
              <Sun className="h-5 w-5 text-violet-500" />
              <span>Görünüm</span>
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">Koyu / Açık Tema</span>
                <span className="text-xs text-slate-500">Portal temasını değiştirin</span>
              </div>
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Açık Tema"
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Koyu Tema"
                >
                  <Moon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Dangerous Zone */}
          <div className="glass-premium border border-red-950/40 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-bold border-b border-red-950/40 pb-3 flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
              <span>Tehlikeli Bölge</span>
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tüm skor geçmişinizi, başarımları ve ayarları tarayıcınızın belleğinden temizleyerek uygulamayı sıfırlayabilirsiniz. Bu işlem geri döndürülemez!
            </p>

            <button
              onClick={handleResetData}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/50 text-red-200 hover:text-red-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Tüm Verileri Sıfırla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
