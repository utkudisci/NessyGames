import { create } from 'zustand';
import { storageService } from '../services/storage/storageService';
import type { UserSettings } from '../services/storage/storageService';

interface SettingsState extends UserSettings {
  setTheme: (theme: 'dark' | 'light') => void;
  setMasterVolume: (val: number) => void;
  setSfxVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  setIsMuted: (val: boolean) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const initialSettings = storageService.getSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initialSettings,

  setTheme: (theme) => {
    set({ theme });
    storageService.saveSettings({ ...storageService.getSettings(), theme });
  },

  setMasterVolume: (masterVolume) => {
    set({ masterVolume });
    storageService.saveSettings({ ...storageService.getSettings(), masterVolume });
  },

  setSfxVolume: (sfxVolume) => {
    set({ sfxVolume });
    storageService.saveSettings({ ...storageService.getSettings(), sfxVolume });
  },

  setMusicVolume: (musicVolume) => {
    set({ musicVolume });
    storageService.saveSettings({ ...storageService.getSettings(), musicVolume });
  },

  setIsMuted: (isMuted) => {
    set({ isMuted });
    storageService.saveSettings({ ...storageService.getSettings(), isMuted });
  },

  updateSettings: (updates) => {
    set((state) => {
      const next = {
        theme: updates.theme ?? state.theme,
        masterVolume: updates.masterVolume ?? state.masterVolume,
        sfxVolume: updates.sfxVolume ?? state.sfxVolume,
        musicVolume: updates.musicVolume ?? state.musicVolume,
        isMuted: updates.isMuted ?? state.isMuted,
      };
      storageService.saveSettings(next);
      return next;
    });
  },
}));

// Initialize theme on load
const currentTheme = useSettingsStore.getState().theme;
if (currentTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
