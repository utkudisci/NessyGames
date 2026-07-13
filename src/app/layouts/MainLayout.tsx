import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../../components/navigation/Navbar';
import { Footer } from '../../components/navigation/Footer';
import { useAchievementStore } from '../../stores/useAchievementStore';
import { useQuestStore } from '../../stores/useQuestStore';
import { Sparkles, X } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { activeToasts, dismissToast } = useAchievementStore();
  const { loadQuests } = useQuestStore();

  // Load daily quests when app mounts to check for date transitions and populate
  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-600/30">
      {/* Background ambient lights */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>

      <Navbar />

      <main className="flex-grow z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />

      {/* Global Achievement Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-4 p-4 rounded-2xl glass-premium border border-amber-500/30 shadow-2xl shadow-amber-500/5 animate-slide-in"
            style={{
              animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div className="p-3 bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl text-2xl flex items-center justify-center">
              {toast.icon}
            </div>
            
            <div className="flex-grow">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm tracking-wide">
                <Sparkles className="h-4 w-4 animate-bounce" />
                <span>BAŞARIM AÇILDI!</span>
              </div>
              <h4 className="text-white font-bold text-base mt-0.5">{toast.title}</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{toast.description}</p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Inject custom CSS keyframes for the notification animation directly */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%) translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
