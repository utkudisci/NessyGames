# Possible Future Additions - Collapse

This document records draft designs for potential features discussed during playtesting that are deferred for future implementation.

## Hover Highlights Toggle Option

### Problem Description
When hovering over groups of connected blocks, the blocks scale up and draw a glowing halo outline. While this is helpful for beginners, experienced players may find this visual feedback distracting or cluttering.

### Proposed Implementation

#### 1. Settings State (`useSettingsStore.ts` & `storageService.ts`)
Add a new field to `UserSettings` state to track this toggle:
```typescript
export interface UserSettings {
  // ... existing options ...
  showHoverHighlight: boolean; // default true
}
```

#### 2. User Interface Toggle (`SettingsPage.tsx`)
Render a clean UI switch toggle inside the System Settings panel:
```tsx
<div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl">
  <div>
    <span className="text-sm font-bold text-white block">Grup Vurgusunu Göster</span>
    <span className="text-[10px] text-slate-500">Blokların üzerine gelince parlamasını sağlar</span>
  </div>
  <button
    onClick={() => updateSettings({ showHoverHighlight: !showHoverHighlight })}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
      showHoverHighlight ? 'bg-violet-600' : 'bg-slate-700'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
      showHoverHighlight ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
</div>
```

#### 3. Phaser Integration (`MainGameScene.ts`)
Inside the pointermove handler (`handlePointerMove`), fetch the setting state and bypass highlighting:
```typescript
  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.isAnimating) return;
    
    // Check setting state
    const showHighlight = useSettingsStore.getState().showHoverHighlight ?? true;
    if (!showHighlight) {
      this.clearHoverHighlight();
      return;
    }
    
    // ... existing highlight logic ...
  }
```
