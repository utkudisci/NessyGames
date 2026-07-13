# NessyGames: Collapse - Technical & Architectural Report

This document serves as a complete blueprint and diagnostic guide for the **Collapse** game in the **NessyGames** suite. Use this as a reference if you need to modify, refactor, or clone its systems for other games.

---

## 1. Core Architecture

The game utilizes a **React + Phaser 3** hybrid architecture.

- **React Wrapper (`CollapseGame.tsx`):** Handles game setup, window resizing (via `ResizeObserver`), state synchronization, React UI/HUD, achievement triggers, and cleanup when unmounting.
- **Phaser 3 Scene (`scenes/MainGameScene.ts`):** Manages the game loop, input handling, grid/row animations, gravity checks, warning visual indicators, particle emitters, and rendering.
- **Event Bus (`utils/EventBus.ts`):** Serves as a bridge between React and Phaser, dispatching events like `score:changed`, `combo:changed`, `game:over`, `perfect:clean`, and debug signals.
- **Audio Service (`services/audio/audioService.ts`):** A centralized synthesizer using the browser's Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, LFOs, etc.) to generate procedural sounds and background music tracks without assets.

---

## 2. Game Modes

### A. Klasik (Classic) Mod
- **Starting Grid:** Spawns with 4 initial rows of blocks.
- **Gameplay Loop:** Moves are turn-based. For every 3 matches (moves) made by the player, a new row of blocks spawns from the bottom, pushing existing blocks up.
- **End Condition:** The game ends immediately when no valid match moves remain on the board.

### B. Süreli (Time) Mod
- **Starting Grid:** Spawns with 3 initial rows.
- **Gameplay Loop:** Spawns a new row from the bottom automatically every 3.5 seconds.
- **Replenishment:** If a **Perfect Clean** is achieved or **no moves remain**, the board instantly repopulates with fresh blocks. The player's goal is to score as much as possible before the countdown timer runs out.

### C. Arcade Mod
- **Spawn Interval:** Rows spawn dynamically from the bottom based on level.
  - Starts at 12 seconds per row (Level 1).
  - Speeds up by 500ms per level.
  - Caps at a maximum speed of 4.8 seconds per row (Level 15+).
- **Warning State:** Triggered if blocks reach the top warning row (row 2 or higher).
  - A red danger overlay flashes, and a pulsing two-tone alarm sound triggers.
  - A 7-second visual countdown appears.
  - If blocks are cleared below the line, the alarm stops. If the countdown hits 0, it's Game Over.

---

## 3. Special Mechanics

### A. Perfect Clean Challenge
- Triggered when the remaining blocks on the board can be fully cleared in exactly one match (e.g. only one connected group remains).
- **Visuals:** Blocks pulse gently (grow by 8%), and a bright, custom pulsing color-tinted halo graphics glow is rendered behind them.
- **Challenge:** The player has a 5-second timer to click the blocks.
  - **Success:** Plays a victory arpeggio/fanfare, triggers confetti, awards +3000 points, and repopulates/advances the game.
  - **Failure:** Plays a buzzer, clears the glow effects, and forces a standard clean/row spawn.

### B. Combo System & Fire Particles
- **Timing:** Matches made within 2.2 seconds increment the current combo.
- **Fire Particles:** When combo > 1, fire particles (synthesized via graphics circle textures) rise from the bottom of the screen.
  - The particle quantity, speed, and emission frequency scale dynamically with the combo count.
  - The effect caps its intensity at 50 combo and ceases immediately when the combo timer expires.
- **Combo Capping & x75 Multiplier:**
  - Combo counts and normal UI indicators cap out at 50.
  - At 50+ combo, the score of the match is multiplied by a flat **75x** instead of adding flat combo bonuses.
  - Matches at 50+ combo spawn a custom, flying rainbow-tinted text: **"MAKSİMUM KOMBO x75!"**.

---

## 4. Audio Engine Details

### Sound FX
- **Pop SFX:** Pitch increases with combo count. Cap pitch is C5 (523.25 Hz).
- **High Combo SFX:** When combo > 50, hitting further matches plays the max note C5 followed immediately by its octave C6 (1046.50 Hz) in a rapid triangle-wave sequence.
- **Alarms:** Low/high sirens and LFO-modulated pitch changes for critical arcade warning states.

### Procedural Background Music
- **Classic:** Ambient, slow, soothing G-major chord progression.
- **Time:** Uptempo, energetic C-major progression, twice as fast as classic.
- **Arcade (10 Levels of Intensity):** Scales dynamically every 5 levels:
  1. *Level 1-5:* D-minor chords, 600ms steps (tense but slow).
  2. *Level 6-10:* F-minor chords, 450ms steps.
  3. *Level 11-15:* A-minor chords, 350ms steps (aggressive).
  4. *Level 16-20:* D-minor (high) chords, 250ms steps.
  5. *Level 21-25:* G-minor (very high) chords, 180ms steps.
  6. *Level 26-30:* Bb-diminished chords, 150ms steps (dissonant tension).
  7. *Level 31-35:* C-minor/chromatic shifts, 130ms steps.
  8. *Level 36-40:* Dissonant E/F minor madness, 110ms steps.
  9. *Level 41-45:* High-pitch G-minor glitch tempo, 90ms steps.
  10. *Level 46-50+:* Ultimate Chaos dissonance, 70ms steps.

---

## 5. Debug Controls
For quick manual testing, the upper play header displays two debug controls:
- **DEBUG TEST:** Clears the board and generates exactly 2 matching red blocks at the bottom row to instantly test the **Perfect Clean** challenge flow.
- **DEBUG COMBO 45:** Instantly bumps the active combo to 45. Used to easily test the high-intensity fire particle animations and cross the 50-combo rainbow text / x75 score multiplier.

---

## 6. Directory / Code Landmarks
- **React entrypoint & states:** [CollapseGame.tsx](file:///c:/Users/disci/Documents/Projects/Games/GameZone/src/games/collapse/CollapseGame.tsx)
- **Phaser Game Scene loop:** [MainGameScene.ts](file:///c:/Users/disci/Documents/Projects/Games/GameZone/src/games/collapse/scenes/MainGameScene.ts)
- **Sound synthesizer engine:** [audioService.ts](file:///c:/Users/disci/Documents/Projects/Games/GameZone/src/services/audio/audioService.ts)
- **Grid configurations:** [collapseConfig.ts](file:///c:/Users/disci/Documents/Projects/Games/GameZone/src/games/collapse/config/collapseConfig.ts)
