import Phaser from 'phaser';
import type { Board, BoardPosition, BlockData, BlockColor } from '../types/collapseTypes';
import { COLLAPSE_CONFIG, COLLAPSE_COLORS } from '../config/collapseConfig';
import { createBoard, findConnectedGroup, collapseBoard, hasAvailableMoves, addRowAtBottom, generateId } from '../systems/boardSystem';
import { gameEventBus } from '../utils/eventBus';
import { audioService } from '../../../services/audio/audioService';
import type { ActiveSoundHandle } from '../../../services/audio/audioService';
import { useGameStore } from '../../../stores/useGameStore';

export class MainGameScene extends Phaser.Scene {
  // Board state
  private board: Board = [];
  private rows: number = COLLAPSE_CONFIG.DEFAULT_ROWS;
  private cols: number = COLLAPSE_CONFIG.DEFAULT_COLS;
  private colorCount: number = COLLAPSE_CONFIG.DEFAULT_COLOR_COUNT;
  private gameMode: 'classic' | 'time' | 'arcade' = 'classic';

  // Game grid drawing parameters
  private gridWidth: number = 450;
  private gridHeight: number = 450;
  private cellSize: number = 40;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private padding: number = 3;

  // Phaser container references
  private blockContainers = new Map<string, Phaser.GameObjects.Container>();
  private gridBg: Phaser.GameObjects.Graphics | null = null;
  private dangerLine: Phaser.GameObjects.Graphics | null = null;
  private cleanTimer: Phaser.Time.TimerEvent | null = null;
  private debugCleanHandler: (() => void) | null = null;
  private debugComboHandler: (() => void) | null = null;
  private timeExpiredHandler: (() => void) | null = null;
  private warningAlarmSound: ActiveSoundHandle | null = null;
  
  private fireEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private perfectCleanOpportunityActive: boolean = false;
  private perfectCleanHalos: Phaser.GameObjects.Graphics[] = [];
  
  // Interaction states
  private isAnimating: boolean = false;
  private hoveredGroup: BoardPosition[] = [];
  private currentCombo: number = 0;
  private lastMatchTime: number = 0;
  private isGameOver: boolean = false;

  // Arcade Mode specific
  private arcadeTimerEvent: Phaser.Time.TimerEvent | null = null;
  private arcadeWarningActive: boolean = false;
  private arcadeWarningOverlay: Phaser.GameObjects.Graphics | null = null;
  private arcadeCountdownText: Phaser.GameObjects.Text | null = null;
  private arcadeWarningTimeRemaining: number = 0;
  private arcadeWarningTimer: Phaser.Time.TimerEvent | null = null;
  private currentSpawnInterval: number = COLLAPSE_CONFIG.ARCADE.INITIAL_SPAWN_INTERVAL;

  constructor() {
    super('MainGameScene');
  }

  init(data: { mode?: 'classic' | 'time' | 'arcade' }) {
    this.gameMode = data.mode || 'classic';
    this.isAnimating = false;
    this.hoveredGroup = [];
    this.currentCombo = 0;
    this.lastMatchTime = 0;
    this.isGameOver = false;
    this.blockContainers.clear();
    this.arcadeWarningActive = false;
    this.currentSpawnInterval = COLLAPSE_CONFIG.ARCADE.INITIAL_SPAWN_INTERVAL;

    if (this.warningAlarmSound) {
      this.warningAlarmSound.stop();
      this.warningAlarmSound = null;
    }
    this.perfectCleanOpportunityActive = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#090d16');
    audioService.playStart();

    // Generate a simple white circle texture for particles
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1.0);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('particle_circle', 16, 16);

    // Create bottom fire emitter
    this.fireEmitter = this.add.particles(0, 0, 'particle_circle', {
      x: { min: 0, max: this.cameras.main.width },
      y: this.cameras.main.height + 20,
      lifespan: { min: 400, max: 1200 },
      speedY: { min: -100, max: -400 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: [ 0xff4500, 0xff8c00, 0xffd700, 0xff0000 ], // Fire colors
      blendMode: 'ADD',
      frequency: -1, // start stopped
      quantity: 1,
    });
    this.fireEmitter.setDepth(0); // Render behind blocks

    // Calculate dimensions dynamically to fit screen
    this.resizeGrid();

    // Initialize the board data
    if (this.gameMode === 'arcade') {
      this.board = this.createArcadeInitialBoard();
    } else {
      this.board = createBoard(this.rows, this.cols, this.colorCount);
    }

    // Render the grid background
    this.drawGridBackground();

    // Spawn the block game objects in Phaser
    this.renderInitialBoard();

    // Register inputs
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);

    // Setup resize handler
    this.scale.on('resize', this.handleResize, this);

    // Emit event that game is ready
    gameEventBus.emit('game:ready');

    // Debug listener for testing clean & perfect clean transitions
    this.debugCleanHandler = () => {
      // Clear board
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.board[r][c] = null;
        }
      }
      
      this.blockContainers.forEach((container) => {
        container.destroy();
      });
      this.blockContainers.clear();

      const redColor: BlockColor = 'red';
      const id1 = 'debug_b1';
      const id2 = 'debug_b2';
      
      const bottomRow = this.rows - 1;
      this.board[bottomRow][0] = { id: id1, row: bottomRow, column: 0, color: redColor };
      this.board[bottomRow][1] = { id: id2, row: bottomRow, column: 1, color: redColor };

      [this.board[bottomRow][0], this.board[bottomRow][1]].forEach((block) => {
        if (block) {
          this.createBlockContainer(block);
        }
      });

      this.isAnimating = false;
      if (this.cleanTimer) {
        this.cleanTimer.destroy();
        this.cleanTimer = null;
      }

      this.afterMatchCollapse();
    };
    gameEventBus.on('debug:set:clean-state', this.debugCleanHandler);

    this.debugComboHandler = () => {
      this.currentCombo = 45;
      this.updateFireIntensity();
      gameEventBus.emit('combo:changed', 45);
    };
    gameEventBus.on('debug:set:combo-45', this.debugComboHandler);

    this.timeExpiredHandler = () => {
      this.gameOver();
    };
    gameEventBus.on('time:expired', this.timeExpiredHandler);

    // Setup Arcade Mode mechanics if active
    if (this.gameMode === 'arcade') {
      this.startArcadeTimer();
      this.createArcadeWarningUI();
    }

    // Clean up sounds on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearArcadeWarning();
    });
  }

  update(time: number, delta: number) {
    if (this.gameMode === 'arcade' && this.arcadeTimerEvent) {
      const progress = this.arcadeTimerEvent.getProgress();
      gameEventBus.emit('arcade:timer:progress', progress);
      
      const dangerProgress = this.arcadeWarningActive
        ? Math.max(0, this.arcadeWarningTimeRemaining / COLLAPSE_CONFIG.ARCADE.COUNTDOWN_TIME)
        : 0;
      gameEventBus.emit('arcade:danger:progress', dangerProgress);
    }

    // Freeze combo timer during animations by pushing lastMatchTime forward by frame delta
    if (this.isAnimating && this.currentCombo > 1) {
      this.lastMatchTime += delta;
    }

    // Emit combo timer progress (active in arcade and time modes only)
    if (this.gameMode !== 'classic' && this.currentCombo > 1) {
      const elapsed = time - this.lastMatchTime;
      if (elapsed >= 2200) {
        // Combo has expired! Reset it to 1 and emit the change!
        this.currentCombo = 1;
        this.updateFireIntensity();
        gameEventBus.emit('combo:changed', 1);
        gameEventBus.emit('combo:timer:progress', 0);
      } else {
        const progress = Math.max(0, Math.min(1, 1 - elapsed / 2200));
        gameEventBus.emit('combo:timer:progress', progress);
      }
    } else {
      gameEventBus.emit('combo:timer:progress', 0);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setSize(width, height);
    this.resizeGrid();
    
    // Clear and redraw grid background
    this.drawGridBackground();

    // Instantly reposition all blocks to fit new scales
    this.blockContainers.forEach((container, id) => {
      const block = this.findBlockById(id);
      if (block) {
        const { x, y } = this.gridToScreen(block.row, block.column);
        container.setPosition(x, y);
        
        // Resize container components
        const graphics = container.first as Phaser.GameObjects.Graphics;
        if (graphics) {
          graphics.clear();
          this.drawBlockGraphics(graphics, block.color);
        }
      }
    });
  }

  private createArcadeInitialBoard(): Board {
    const board: Board = [];
    const activeColors = COLLAPSE_COLORS.slice(0, this.colorCount);
    const fillStartRow = Math.floor(this.rows / 2);

    for (let r = 0; r < this.rows; r++) {
      const rowArray: (BlockData | null)[] = [];
      for (let c = 0; c < this.cols; c++) {
        if (r >= fillStartRow) {
          rowArray.push({
            id: generateId(),
            row: r,
            column: c,
            color: activeColors[Math.floor(Math.random() * activeColors.length)],
          });
        } else {
          rowArray.push(null);
        }
      }
      board.push(rowArray);
    }
    return board;
  }

  private resizeGrid() {
    const width = this.scale.width;
    const height = this.scale.height;

    // We want the grid to fit inside the canvas with some margins
    const margin = 20;
    const maxGridSize = Math.min(width - margin * 2, height - margin * 2);

    this.gridWidth = maxGridSize;
    this.gridHeight = maxGridSize;

    // Cell size depends on max dimension
    this.cellSize = maxGridSize / this.cols;

    // Center the grid in the canvas
    this.gridOffsetX = (width - this.gridWidth) / 2;
    this.gridOffsetY = (height - this.gridHeight) / 2;
  }

  private drawGridBackground() {
    if (this.gridBg) {
      this.gridBg.destroy();
    }
    
    // Redraw grid background
    this.gridBg = this.add.graphics({ lineStyle: { width: 1, color: 0x1e293b, alpha: 0.3 } });
    this.gridBg.setDepth(-1); // Always draw behind blocks to prevent darkness overlay!
    
    // Draw outer boundary
    this.gridBg.fillStyle(0x0f172a, 0.4);
    this.gridBg.fillRoundedRect(this.gridOffsetX, this.gridOffsetY, this.gridWidth, this.gridHeight, 16);
    this.gridBg.lineStyle(1.5, 0x1e293b, 0.5);
    this.gridBg.strokeRoundedRect(this.gridOffsetX, this.gridOffsetY, this.gridWidth, this.gridHeight, 16);

    // Draw inner grid lines for puzzle alignment
    for (let c = 1; c < this.cols; c++) {
      const x = this.gridOffsetX + c * this.cellSize;
      this.gridBg.lineBetween(x, this.gridOffsetY, x, this.gridOffsetY + this.gridHeight);
    }
    for (let r = 1; r < this.rows; r++) {
      const y = this.gridOffsetY + r * this.cellSize;
      this.gridBg.lineBetween(this.gridOffsetX, y, this.gridOffsetX + this.gridWidth, y);
    }

    // Handle danger line overlay
    if (this.dangerLine) {
      this.dangerLine.destroy();
      this.dangerLine = null;
    }

    // Draw neon danger line for Arcade mode warning threshold (üstten 3. satır geçildikten sonrası için sınır çizgisi)
    if (this.gameMode === 'arcade') {
      this.dangerLine = this.add.graphics();
      this.dangerLine.setDepth(5); // Render danger line on top of blocks for clear visibility!

      const dangerY = this.gridOffsetY + (COLLAPSE_CONFIG.ARCADE.WARNING_ROW + 1) * this.cellSize;
      
      // Neon glow underlay
      this.dangerLine.lineStyle(4, 0xef4444, 0.4);
      this.dangerLine.lineBetween(this.gridOffsetX, dangerY, this.gridOffsetX + this.gridWidth, dangerY);
      
      // Core sharp danger red line
      this.dangerLine.lineStyle(2, 0xef4444, 0.95);
      this.dangerLine.lineBetween(this.gridOffsetX, dangerY, this.gridOffsetX + this.gridWidth, dangerY);

      // Neon warning markers on left and right borders
      this.dangerLine.fillStyle(0xef4444, 0.7);
      this.dangerLine.fillRect(this.gridOffsetX - 6, dangerY - 3, 6, 6);
      this.dangerLine.fillRect(this.gridOffsetX + this.gridWidth, dangerY - 3, 6, 6);
    }
  }

  private renderInitialBoard() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.board[r][c];
        if (block) {
          this.createBlockContainer(block);
        }
      }
    }
  }

  private createBlockContainer(block: BlockData) {
    const { x, y } = this.gridToScreen(block.row, block.column);

    const container = this.add.container(x, y);
    container.setSize(this.cellSize, this.cellSize);
    
    // Custom graphical block drawing
    const graphics = this.add.graphics();
    this.drawBlockGraphics(graphics, block.color);

    container.add(graphics);
    
    // Save block properties in Phaser container data registry
    container.setData('id', block.id);
    container.setData('row', block.row);
    container.setData('column', block.column);
    container.setData('color', block.color);

    this.blockContainers.set(block.id, container);

    // Spawn entrance animation (pop in)
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      delay: (block.row * 15) + (block.column * 15)
    });
  }

  private drawBlockGraphics(graphics: Phaser.GameObjects.Graphics, color: BlockColor) {
    const size = this.cellSize - this.padding * 2;
    const hexColor = COLLAPSE_CONFIG.COLOR_PALETTE[color];
    const glowColor = COLLAPSE_CONFIG.GLOW_PALETTE[color];
    const halfSize = size / 2;
    
    graphics.clear();

    // 1. Drop shadow / Ambient shadow (centered around container origin 0,0)
    graphics.fillStyle(0x000000, 0.45);
    graphics.fillRoundedRect(-halfSize + 1.5, -halfSize + 2.5, size, size, 8);

    // 2. Base Block Color
    graphics.fillStyle(hexColor, 1);
    graphics.fillRoundedRect(-halfSize, -halfSize, size, size, 8);

    // 3. Top-left light reflection (Glossmorphic look)
    graphics.fillStyle(0xffffff, 0.15);
    graphics.fillRoundedRect(-halfSize + 2, -halfSize + 2, size - 4, size / 3, { tl: 6, tr: 6, bl: 0, br: 0 });

    // 4. Subtle inner border accent
    graphics.lineStyle(1.5, glowColor, 0.45);
    graphics.strokeRoundedRect(-halfSize, -halfSize, size, size, 8);
  }

  private drawHoverHighlight(graphics: Phaser.GameObjects.Graphics, color: BlockColor) {
    const size = this.cellSize - this.padding * 2;
    const glowColor = COLLAPSE_CONFIG.GLOW_PALETTE[color];
    const halfSize = size / 2;
    
    // Draw standard block first
    this.drawBlockGraphics(graphics, color);

    // Overlay glowing highlight border
    graphics.lineStyle(3, 0xffffff, 0.95);
    graphics.strokeRoundedRect(-halfSize, -halfSize, size, size, 8);
    
    // Add additional bright glow lines
    graphics.lineStyle(1.5, glowColor, 1.0);
    graphics.strokeRoundedRect(-halfSize - 1, -halfSize - 1, size + 2, size + 2, 9);
  }

  private gridToScreen(row: number, col: number): { x: number; y: number } {
    const x = this.gridOffsetX + col * this.cellSize + this.cellSize / 2;
    const y = this.gridOffsetY + row * this.cellSize + this.cellSize / 2;
    return { x, y };
  }

  private screenToGrid(x: number, y: number): { row: number; col: number } | null {
    const relativeX = x - this.gridOffsetX;
    const relativeY = y - this.gridOffsetY;

    if (relativeX < 0 || relativeX >= this.gridWidth || relativeY < 0 || relativeY >= this.gridHeight) {
      return null;
    }

    const col = Math.floor(relativeX / this.cellSize);
    const row = Math.floor(relativeY / this.cellSize);

    return { row, col };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.isAnimating) return;

    const gridPos = this.screenToGrid(pointer.x, pointer.y);
    if (!gridPos) {
      this.clearHoverHighlight();
      return;
    }

    const block = this.board[gridPos.row]?.[gridPos.col];
    if (!block) {
      this.clearHoverHighlight();
      return;
    }

    // Find connections
    const group = findConnectedGroup(this.board, gridPos.row, gridPos.col);

    // If hover remains in same group, do nothing
    if (this.isSameGroup(group, this.hoveredGroup)) {
      return;
    }

    // Clear previous group highlights
    this.clearHoverHighlight();

    // Vurgula
    if (group.length >= COLLAPSE_CONFIG.MIN_GROUP_SIZE) {
      this.hoveredGroup = group;
      
      group.forEach(pos => {
        const cell = this.board[pos.row][pos.column];
        if (cell) {
          const container = this.blockContainers.get(cell.id);
          if (container) {
            // Apply scale up tween for hover feed
            this.tweens.add({
              targets: container,
              scaleX: 1.05,
              scaleY: 1.05,
              duration: 80,
              ease: 'Quad.easeOut'
            });

            // Draw highlight border
            const graphics = container.first as Phaser.GameObjects.Graphics;
            if (graphics) {
              this.drawHoverHighlight(graphics, cell.color);
            }
          }
        }
      });
    }
  }

  private clearHoverHighlight() {
    if (this.hoveredGroup.length === 0) return;

    this.hoveredGroup.forEach(pos => {
      const cell = this.board[pos.row]?.[pos.column];
      if (cell) {
        const container = this.blockContainers.get(cell.id);
        if (container) {
          this.tweens.add({
            targets: container,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 80,
            ease: 'Quad.easeOut'
          });

          const graphics = container.first as Phaser.GameObjects.Graphics;
          if (graphics) {
            this.drawBlockGraphics(graphics, cell.color);
          }
        }
      }
    });

    this.hoveredGroup = [];
  }

  private isSameGroup(g1: BoardPosition[], g2: BoardPosition[]): boolean {
    if (g1.length !== g2.length) return false;
    return g1.every(p1 => g2.some(p2 => p1.row === p2.row && p1.column === p2.column));
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.isAnimating) return;

    const gridPos = this.screenToGrid(pointer.x, pointer.y);
    if (!gridPos) return;

    const block = this.board[gridPos.row]?.[gridPos.col];
    if (!block) return;

    const group = findConnectedGroup(this.board, gridPos.row, gridPos.col);

    if (group.length >= COLLAPSE_CONFIG.MIN_GROUP_SIZE) {
      // Clear hover highlight immediately before performing match
      this.clearHoverHighlight();
      
      this.performMatch(group, block.color, pointer.x, pointer.y);
    } else {
      // Feedback animation for invalid click
      const container = this.blockContainers.get(block.id);
      if (container) {
        audioService.playClick();
        this.tweens.add({
          targets: container,
          x: container.x + 4,
          yoyo: true,
          repeat: 2,
          duration: 40,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  private performMatch(group: BoardPosition[], color: BlockColor, clickX: number, clickY: number) {
    this.isAnimating = true;

    // Cancel pending clean sequence if active
    if (this.cleanTimer) {
      this.cleanTimer.destroy();
      this.cleanTimer = null;
    }
    if (this.perfectCleanOpportunityActive) {
      this.clearPerfectCleanEffects();
    }

    // Track Combo timing (Arcade and Time modes only)
    const currentTime = this.time.now;
    if (this.gameMode !== 'classic' && currentTime - this.lastMatchTime < 2200) {
      this.currentCombo++;
    } else {
      this.currentCombo = 1;
    }
    this.lastMatchTime = currentTime;

    this.updateFireIntensity();

    // Calculate score
    const groupSize = group.length;
    const rawScore = groupSize * groupSize * COLLAPSE_CONFIG.SCORE_MULTIPLIER;
    
    // Apply combo bonus
    let finalScore = rawScore;
    if (this.gameMode !== 'classic' && this.currentCombo > 1) {
      if (this.currentCombo >= 50) {
        finalScore = rawScore * 75; // Multiply by 75 for massive score
      } else {
        const comboBonus = (this.currentCombo - 1) * 50;
        finalScore = rawScore + comboBonus;
      }
    }

    // Play synthesized pop SFX
    audioService.playPop(groupSize);
    if (this.gameMode !== 'classic' && this.currentCombo > 1) {
      audioService.playCombo(this.currentCombo);
    }

    // Trigger achievement evaluations via event bus
    if (groupSize >= 10) {
      gameEventBus.emit('achievement:trigger', 'big_bang');
    }
    if (this.gameMode !== 'classic' && this.currentCombo >= 2) {
      gameEventBus.emit('achievement:trigger', 'combo_start');
    }

    // Emit score and updates to React HUD
    gameEventBus.emit('score:changed', finalScore);
    if (this.gameMode !== 'classic') {
      const displayCombo = Math.min(this.currentCombo, 50); // Cap UI combo visual at 50
      gameEventBus.emit('combo:changed', displayCombo);
    }
    gameEventBus.emit('blocks:removed', groupSize);

    // Spawning particles
    this.createExplosionParticles(group, color);

    // Flying score display
    if (this.gameMode !== 'classic' && this.currentCombo >= 50) {
      this.spawnRainbowText("MAKSİMUM KOMBO\nx75!", clickX, clickY);
    } else {
      this.spawnScoreText(finalScore, clickX, clickY);
    }

    // Build timeline of animations
    const destroyTweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    // Remove block game objects in Phaser
    group.forEach(pos => {
      const cell = this.board[pos.row][pos.column];
      if (cell) {
        const container = this.blockContainers.get(cell.id);
        if (container) {
          this.blockContainers.delete(cell.id);
          
          destroyTweens.push({
            targets: container,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 80,
            ease: 'Back.easeIn',
            onComplete: () => {
              container.destroy();
            }
          });
        }
        
        // Nullify in data model
        this.board[pos.row][pos.column] = null;
      }
    });

    // Run tweens to fade out matched blocks
    this.tweens.addMultiple(destroyTweens);

    // Collapse board after fade out completes
    this.time.delayedCall(90, () => {
      const { board: nextBoard, movements } = collapseBoard(this.board);
      this.board = nextBoard;

      // Animate shifted blocks
      const shiftTweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

      movements.forEach(m => {
        const container = this.blockContainers.get(m.blockId);
        if (container) {
          const { x, y } = this.gridToScreen(m.toRow, m.toCol);
          container.setData('row', m.toRow);
          container.setData('column', m.toCol);

          shiftTweens.push({
            targets: container,
            x: x,
            y: y,
            duration: 120,
            ease: 'Cubic.easeOut'
          });
        }
      });

      if (shiftTweens.length > 0) {
        this.tweens.addMultiple(shiftTweens);
        // Wait for sliding to finish
        this.time.delayedCall(130, () => {
          this.afterMatchCollapse();
        });
      } else {
        this.afterMatchCollapse();
      }
    });
  }

  private afterMatchCollapse() {
    this.isAnimating = false;

    // Check if board is completely cleared
    let remainingCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c]) remainingCount++;
      }
    }

    if (remainingCount === 0) {
      // Cancel pending clean sequence if active
      if (this.cleanTimer) {
        this.cleanTimer.destroy();
        this.cleanTimer = null;
      }
      audioService.playFanfare();
      gameEventBus.emit('score:changed', 3000); // 3000 pts perfect clearance bonus!
      gameEventBus.emit('perfect:clean'); // Trigger React Confetti overlay
      gameEventBus.emit('achievement:trigger', 'clean_board');

      // Show big "MÜKEMMEL TEMİZLİK!\n+3000 PUAN" message in center (Just like clean, but rainbow gradient!)
      const perfectText = this.add.text(this.gridOffsetX + this.gridWidth / 2, this.gridOffsetY + this.gridHeight / 2, 'MÜKEMMEL TEMİZLİK!\n+3000 PUAN', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5, 0.5).setDepth(10);
      perfectText.setStroke('#000000', 8);

      // Apply rainbow linear gradient
      const gradient = perfectText.context.createLinearGradient(0, 0, perfectText.width, 0);
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(0.2, '#f97316');
      gradient.addColorStop(0.4, '#eab308');
      gradient.addColorStop(0.6, '#22c55e');
      gradient.addColorStop(0.8, '#3b82f6');
      gradient.addColorStop(1, '#a855f7');
      perfectText.setFill(gradient);

      this.tweens.add({
        targets: perfectText,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          perfectText.destroy();
        }
      });
      
      // Re-populate classical boards or let the game finish
      if (this.gameMode === 'classic') {
        // Single board mode: after perfect clean, the game ends.
        this.time.delayedCall(2000, () => {
          useGameStore.getState().endGame();
        });
        return;
      } else if (this.gameMode === 'time') {
        // Time mode: after perfect clean, repopulate board so they can continue scoring
        this.time.delayedCall(2000, () => {
          this.repopulateBoard();
        });
        return;
      } else if (this.gameMode === 'arcade') {
        this.isAnimating = true;
        // Wait 1.5 seconds to let the player admire the clean board and confetti, then spawn 3 rows instantly!
        this.time.delayedCall(1500, () => {
          this.spawnNewArcadeRow(true);
          this.time.delayedCall(120, () => this.spawnNewArcadeRow(true));
          this.time.delayedCall(240, () => this.spawnNewArcadeRow(true));
          
          this.time.delayedCall(360, () => {
            this.isAnimating = false;
            this.checkArcadeWarningState();
          });
        });
      }
    } else if (this.checkPerfectCleanOpportunity()) {
      // PERFECT CLEAN CHALLENGE: Pulse blocks with halo glow, give 5 seconds to click!
      if (!this.cleanTimer) {
        this.perfectCleanOpportunityActive = true;

        // Add pulsing grow effect (1.0 -> 1.08 -> 1.0) and halo glow to remaining blocks
        this.blockContainers.forEach((container) => {
          // Gentle pulse: grow slightly then return to original, no shrink below 1.0
          this.tweens.add({
            targets: container,
            scaleX: 1.08,
            scaleY: 1.08,
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut'
          });

          // Draw bright halo glow behind block
          const blockColor = container.getData('color') as BlockColor;
          const glowColor = COLLAPSE_CONFIG.GLOW_PALETTE[blockColor];
          const size = this.cellSize - this.padding * 2;
          const halfSize = size / 2;
          const halo = this.add.graphics();
          halo.setPosition(container.x, container.y);
          halo.setDepth(container.depth - 1);

          // Outer soft glow ring
          halo.fillStyle(glowColor, 0.3);
          halo.fillRoundedRect(-halfSize - 5, -halfSize - 5, size + 10, size + 10, 12);
          // Inner brighter glow ring
          halo.fillStyle(glowColor, 0.15);
          halo.fillRoundedRect(-halfSize - 9, -halfSize - 9, size + 18, size + 18, 14);

          // Pulse the halo alpha
          this.tweens.add({
            targets: halo,
            alpha: { from: 1.0, to: 0.4 },
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut'
          });

          this.perfectCleanHalos.push(halo);
        });

        // Start 5-second countdown timer
        this.cleanTimer = this.time.delayedCall(5000, () => {
          this.cleanTimer = null;

          // Play wrong buzzer sound
          audioService.playWrongBuzzer();

          this.clearPerfectCleanEffects();

          // Trigger standard Clean sequence because they missed the opportunity
          this.triggerCleanSequence();
        });
      }
      return;
    }

    // Check if game over conditions are met
    if (!hasAvailableMoves(this.board) && remainingCount > 0) {
      // Check the special unmatchable leftovers <= 4 rule
      let isUnmatchableLeftovers = false;
      if (remainingCount <= 4) {
        const colorCounts: { [key: string]: number } = {};
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            const b = this.board[r][c];
            if (b) {
              colorCounts[b.color] = (colorCounts[b.color] || 0) + 1;
            }
          }
        }
        const maxColorCount = Math.max(...Object.values(colorCounts));
        if (maxColorCount < COLLAPSE_CONFIG.MIN_GROUP_SIZE) {
          isUnmatchableLeftovers = true;
        }
      }

      if (isUnmatchableLeftovers) {
        if (this.gameMode === 'classic' || this.gameMode === 'time') {
          // Give them the clean bonus, then the game will end in triggerCleanSequence
          this.triggerCleanSequence();
        } else {
          // Arcade mode
          const rand = Math.random();
          if (rand < 0.7) {
            this.triggerCleanSequence();
          } else {
            this.time.delayedCall(400, () => {
              const addRowText = this.add.text(this.gridOffsetX + this.gridWidth / 2, this.gridOffsetY + this.gridHeight / 2, 'HAMLE KALMADI!\nYENİ SATIR EKLENİYOR...', {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#10b981',
                align: 'center'
              }).setOrigin(0.5, 0.5).setDepth(10);
              addRowText.setStroke('#000000', 6);
              this.tweens.add({
                targets: addRowText,
                scaleX: 1.1,
                scaleY: 1.1,
                alpha: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => addRowText.destroy()
              });
              this.spawnNewArcadeRow(true);
            });
          }
        }
      } else {
        if (this.gameMode === 'classic') {
          // No moves left on single board, game over
          useGameStore.getState().endGame();
        } else if (this.gameMode === 'time') {
          // Time mode: no moves left, repopulate board so they can continue scoring
          this.repopulateBoard();
        } else {
          // Arcade Normal behavior: Roll random chance: 70% shuffle, 30% add new row alttan
          const rand = Math.random();
          if (rand < 0.7) {
            this.time.delayedCall(400, () => {
              this.shuffleBoard();
            });
          } else {
            // Add new row alttan
            this.time.delayedCall(400, () => {
              const addRowText = this.add.text(this.gridOffsetX + this.gridWidth / 2, this.gridOffsetY + this.gridHeight / 2, 'HAMLE KALMADI!\nYENİ SATIR EKLENİYOR...', {
                fontFamily: 'Outfit, sans-serif',
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#10b981',
                align: 'center'
              }).setOrigin(0.5, 0.5).setDepth(10);
              addRowText.setStroke('#000000', 6);
              this.tweens.add({
                targets: addRowText,
                scaleX: 1.1,
                scaleY: 1.1,
                alpha: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => addRowText.destroy()
              });
              this.spawnNewArcadeRow(true); // Spawn row instantly!
            });
          }
        }
      }
    }

    // If Arcade mode, re-assess warnings immediately after collapse
    if (this.gameMode === 'arcade') {
      this.checkArcadeWarningState();
    }
  }

  private repopulateBoard() {
    this.blockContainers.forEach(container => container.destroy());
    this.blockContainers.clear();
    this.board = createBoard(this.rows, this.cols, this.colorCount);
    this.renderInitialBoard();
  }

  private shuffleBoard() {
    this.isAnimating = true;
    this.clearHoverHighlight();

    const activeBlocks: { id: string; color: BlockColor }[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.board[r][c];
        if (block) {
          activeBlocks.push({ id: block.id, color: block.color });
        }
      }
    }

    if (activeBlocks.length === 0) {
      this.isAnimating = false;
      return;
    }

    // Perform shuffles until a valid move exists (or up to 20 times max)
    let shuffleCount = 0;
    let success = false;
    let shuffledBoard: Board = [];

    while (shuffleCount < 20 && !success) {
      // Scramble activeBlocks colors using Fisher-Yates
      for (let i = activeBlocks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = activeBlocks[i].color;
        activeBlocks[i].color = activeBlocks[j].color;
        activeBlocks[j].color = temp;
      }

      // Reconstruct temporary board maintaining the same block layout positions
      shuffledBoard = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
      let blockIndex = 0;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.board[r][c] !== null) {
            const shuffledBlock = activeBlocks[blockIndex++];
            shuffledBoard[r][c] = {
              id: shuffledBlock.id,
              row: r,
              column: c,
              color: shuffledBlock.color
            };
          }
        }
      }

      if (hasAvailableMoves(shuffledBoard) || activeBlocks.length < 2) {
        success = true;
      }
      shuffleCount++;
    }

    this.board = shuffledBoard;

    const centerX = this.gridOffsetX + this.gridWidth / 2;
    const centerY = this.gridOffsetY + this.gridHeight / 2;
    const floatTweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];

    let blockIndex = 0;
    this.blockContainers.forEach((container, id) => {
      const block = this.findBlockById(id);
      if (block) {
        const staggerDelay = blockIndex * 10; // 10ms sequential stagger delay for wave fly-in
        blockIndex++;

        floatTweens.push({
          targets: container,
          x: centerX,
          y: centerY,
          scaleX: 0.3,
          scaleY: 0.3,
          alpha: 0.5,
          delay: staggerDelay,
          duration: 250,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            // Update visual state at the center
            container.setData('color', block.color);
            const graphics = container.first as Phaser.GameObjects.Graphics;
            if (graphics) {
              graphics.clear();
              this.drawBlockGraphics(graphics, block.color);
            }

            // Animate outwards from center to the new dest coordinates
            const dest = this.gridToScreen(block.row, block.column);
            this.tweens.add({
              targets: container,
              x: dest.x,
              y: dest.y,
              scaleX: 1.0,
              scaleY: 1.0,
              alpha: 1.0,
              duration: 250,
              ease: 'Cubic.easeOut'
            });
          }
        });
      }
    });

    if (floatTweens.length > 0) {
      audioService.playStart();

      const shuffleText = this.add.text(centerX, centerY, 'HAMLE KALMADI!\nKARIŞTIRILIYOR...', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#a78bfa',
        align: 'center'
      }).setOrigin(0.5, 0.5).setDepth(10);
      shuffleText.setStroke('#000000', 6);
      
      this.tweens.add({
        targets: shuffleText,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: { from: 1, to: 0 },
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          shuffleText.destroy();
        }
      });

      this.tweens.addMultiple(floatTweens);

      const totalAnimationTime = (blockIndex * 10) + 550; // max stagger delay + fly-in + fly-out (500ms) + 50ms buffer
      this.time.delayedCall(totalAnimationTime, () => {
        this.isAnimating = false;
        
        // Safety check: if no moves are available even after shuffle, handle it to prevent deadlocks!
        if (!hasAvailableMoves(this.board)) {
          if (this.gameMode === 'arcade') {
            this.spawnNewArcadeRow(true);
          } else if (this.gameMode === 'time') {
            this.repopulateBoard();
          } else if (this.gameMode === 'classic') {
            useGameStore.getState().endGame();
          }
        }

        if (this.gameMode === 'arcade') {
          this.checkArcadeWarningState();
        }
      });
    } else {
      this.isAnimating = false;
    }
  }

  private spawnScoreText(score: number, x: number, y: number) {
    const text = this.add.text(x, y - 20, `+${score}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5, 0.5);

    text.setStroke('#000000', 4);

    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  private spawnRainbowText(msg: string, x: number, y: number) {
    const text = this.add.text(x, y - 20, msg, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5, 0.5).setDepth(20);

    text.setStroke('#000000', 6);

    // Rainbow tint animation using update loop event since we can't easily tween tint over HSV
    let hue = 0;
    const colorUpdateEvent = this.time.addEvent({
      delay: 20,
      loop: true,
      callback: () => {
        if (!text.active) return;
        hue = (hue + 10) % 360;
        const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1) as Phaser.Types.Display.ColorObject;
        text.setTint(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      }
    });

    this.tweens.add({
      targets: text,
      y: y - 120,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        colorUpdateEvent.destroy();
        text.destroy();
      }
    });
  }

  private updateFireIntensity() {
    if (!this.fireEmitter) return;
    
    if (this.currentCombo > 1) {
      const cappedCombo = Math.min(this.currentCombo, 50);
      const intensity = cappedCombo / 50; // 0.0 to 1.0
      
      const freq = Phaser.Math.Linear(80, 5, intensity);
      const qty = Math.floor(Phaser.Math.Linear(1, 5, intensity));
      
      this.fireEmitter.setFrequency(freq);
      this.fireEmitter.setQuantity(qty);
    } else {
      this.fireEmitter.setFrequency(-1); // Stop
    }
  }

  private createExplosionParticles(group: BoardPosition[], color: BlockColor) {
    const hexColor = COLLAPSE_CONFIG.COLOR_PALETTE[color];

    group.forEach(pos => {
      const { x, y } = this.gridToScreen(pos.row, pos.column);

      // Procedural particle explosion using simple sprites
      for (let i = 0; i < 8; i++) {
        const pSize = Phaser.Math.Between(4, 10);
        const particle = this.add.graphics();
        particle.fillStyle(hexColor, 0.95);
        particle.fillCircle(0, 0, pSize);
        particle.setPosition(x, y);

        // Random vector
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.Between(100, 250);
        
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * speed * 0.3,
          y: y + Math.sin(angle) * speed * 0.3,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          duration: 350 + Phaser.Math.Between(0, 150),
          ease: 'Cubic.easeOut',
          onComplete: () => {
            particle.destroy();
          }
        });
      }
    });
  }

  private findBlockById(id: string): BlockData | null {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c]?.id === id) {
          return this.board[r][c];
        }
      }
    }
    return null;
  }

  // --- Arcade Mode logic ---
  private startArcadeTimer() {
    if (this.arcadeTimerEvent) this.arcadeTimerEvent.destroy();

    this.arcadeTimerEvent = this.time.addEvent({
      delay: this.currentSpawnInterval,
      callback: this.spawnNewArcadeRow,
      callbackScope: this,
      loop: true
    });
  }

  private spawnNewArcadeRow(isInstant: boolean = false) {
    if (this.isAnimating) {
      // Postpone spawn by 400ms if instant, otherwise 1000ms
      const delay = isInstant ? 400 : 1000;
      this.time.delayedCall(delay, () => this.spawnNewArcadeRow(isInstant), [], this);
      return;
    }

    // Reset the automatic spawn timer so player gets breathing room!
    if (this.gameMode === 'arcade') {
      this.startArcadeTimer();
    }

    this.isAnimating = true;
    this.clearHoverHighlight();

    // Call addRowAtBottom system
    const { board: nextBoard, movements, overflow } = addRowAtBottom(this.board, this.colorCount);
    this.board = nextBoard;

    if (overflow) {
      this.gameOver();
      return;
    }

    // Tweens list for shifting current blocks UP
    const shiftTweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
    const tweenDuration = isInstant ? 100 : 300;

    movements.forEach(m => {
      const container = this.blockContainers.get(m.blockId);
      if (container) {
        const { x, y } = this.gridToScreen(m.toRow, m.toCol);
        container.setData('row', m.toRow);
        container.setData('column', m.toCol);

        shiftTweens.push({
          targets: container,
          x: x,
          y: y,
          duration: tweenDuration,
          ease: isInstant ? 'Linear' : 'Cubic.easeInOut'
        });
      }
    });

    // Spawn new row containers at bottom (row - 1)
    for (let c = 0; c < this.cols; c++) {
      const block = this.board[this.rows - 1][c];
      if (block) {
        // Position it below screen initially for nice entry slide
        const targetPos = this.gridToScreen(this.rows - 1, c);
        const container = this.add.container(targetPos.x, targetPos.y + this.cellSize);
        container.setSize(this.cellSize, this.cellSize);

        const graphics = this.add.graphics();
        this.drawBlockGraphics(graphics, block.color);
        container.add(graphics);

        container.setData('id', block.id);
        container.setData('row', block.row);
        container.setData('column', block.column);
        container.setData('color', block.color);

        this.blockContainers.set(block.id, container);

        // Slide up tween
        shiftTweens.push({
          targets: container,
          y: targetPos.y,
          duration: tweenDuration,
          ease: isInstant ? 'Linear' : 'Cubic.easeInOut'
        });
      }
    }

    this.tweens.addMultiple(shiftTweens);

    const animationTime = tweenDuration + 20; // 120ms for instant, 320ms for normal
    this.time.delayedCall(animationTime, () => {
      this.isAnimating = false;
      this.checkArcadeWarningState();
    });
  }

  private createArcadeWarningUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Red vignette flash overlay
    this.arcadeWarningOverlay = this.add.graphics();
    this.arcadeWarningOverlay.fillStyle(0xff0000, 0.15);
    this.arcadeWarningOverlay.fillRect(0, 0, width, height);
    this.arcadeWarningOverlay.setAlpha(0);

    // Flashing red countdown text
    this.arcadeCountdownText = this.add.text(width / 2, this.gridOffsetY - 40, '', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ef4444'
    }).setOrigin(0.5, 0.5);
    
    this.arcadeCountdownText.setStroke('#000000', 4);
    this.arcadeCountdownText.setAlpha(0);
  }

  private checkArcadeWarningState() {
    if (this.gameMode !== 'arcade') return;

    // Check if any block exists above warning row (row 8)
    let warningRequired = false;
    const thresholdRow = COLLAPSE_CONFIG.ARCADE.WARNING_ROW;
    
    for (let r = 0; r <= thresholdRow; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== null) {
          warningRequired = true;
          break;
        }
      }
      if (warningRequired) break;
    }

    if (warningRequired) {
      if (!this.arcadeWarningActive) {
        this.triggerArcadeWarning();
      }
    } else {
      if (this.arcadeWarningActive) {
        this.clearArcadeWarning();
      }
    }
  }

  private triggerArcadeWarning() {
    this.arcadeWarningActive = true;
    this.arcadeWarningTimeRemaining = COLLAPSE_CONFIG.ARCADE.COUNTDOWN_TIME;

    // Start warning alarm loop
    if (!this.warningAlarmSound) {
      this.warningAlarmSound = audioService.playTwoToneAlarm({
        duration: 999,
        lowFrequency: 820,
        highFrequency: 1100,
        interval: 0.22,
        volume: 0.45
      });
    }

    // Flashing screen
    this.tweens.add({
      targets: this.arcadeWarningOverlay,
      alpha: 1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.arcadeCountdownText?.setAlpha(1);
    this.arcadeCountdownText?.setText(`TEHLİKE! TAVAN SÜRESİ: ${this.arcadeWarningTimeRemaining}`);

    // Pulse countdown text
    this.tweens.add({
      targets: this.arcadeCountdownText,
      scaleX: 1.2,
      scaleY: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 350
    });

    // Start 100ms countdown tick timer (ticks 10 times per second for smooth dynamic speed scaling)
    this.arcadeWarningTimer = this.time.addEvent({
      delay: 100,
      callback: this.tickWarningCountdown,
      callbackScope: this,
      loop: true
    });
  }

  private tickWarningCountdown() {
    // Count overflow blocks (above row 2)
    let overflowBlockCount = 0;
    const thresholdRow = COLLAPSE_CONFIG.ARCADE.WARNING_ROW;
    for (let r = 0; r <= thresholdRow; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== null) {
          overflowBlockCount++;
        }
      }
    }

    if (overflowBlockCount === 0) {
      this.clearArcadeWarning();
      return;
    }

    // Speed multiplier scales up with overflow block count
    // Base speed is 0.4 (very slow if only 1 block is above)
    // Speed increases by 0.2 per additional block above the line
    const speedMultiplier = 0.4 + 0.2 * overflowBlockCount;

    // Decrease warning remaining time by (0.1 * speedMultiplier) seconds
    this.arcadeWarningTimeRemaining -= 0.1 * speedMultiplier;

    if (this.arcadeWarningTimeRemaining <= 0) {
      this.arcadeCountdownText?.setText('SÜRE BİTTİ!');
      this.gameOver();
    } else {
      // Show remaining time rounded to 1 decimal place
      this.arcadeCountdownText?.setText(`TEHLİKE! TAVAN SÜRESİ: ${this.arcadeWarningTimeRemaining.toFixed(1)}s`);
    }
  }

  private clearArcadeWarning() {
    this.arcadeWarningActive = false;

    if (this.warningAlarmSound) {
      this.warningAlarmSound.stop();
      this.warningAlarmSound = null;
    }

    // Destroy warning timers
    if (this.arcadeWarningTimer) {
      this.arcadeWarningTimer.destroy();
      this.arcadeWarningTimer = null;
    }

    // Stop overlays
    if (this.arcadeWarningOverlay) this.tweens.killTweensOf(this.arcadeWarningOverlay);
    if (this.arcadeCountdownText) this.tweens.killTweensOf(this.arcadeCountdownText);
    
    this.arcadeWarningOverlay?.setAlpha(0);
    this.arcadeCountdownText?.setAlpha(0);
    this.arcadeCountdownText?.setScale(1);
  }

  // Handle external difficulty level-ups in Arcade mode
  public updateArcadeSpeed(level: number) {
    if (this.gameMode !== 'arcade') return;

    // Reduce interval per level, floor at min speed
    const nextInterval = Math.max(
      COLLAPSE_CONFIG.ARCADE.MIN_SPAWN_INTERVAL,
      COLLAPSE_CONFIG.ARCADE.INITIAL_SPAWN_INTERVAL - (level - 1) * COLLAPSE_CONFIG.ARCADE.DIFFICULTY_SPEED_UP
    );

    this.currentSpawnInterval = nextInterval;
  }

  // Pause / Resume triggers from React UI
  public setPause(paused: boolean) {
    if (paused) {
      this.scene.pause();
      if (this.arcadeTimerEvent) this.arcadeTimerEvent.paused = true;
      if (this.arcadeWarningTimer) this.arcadeWarningTimer.paused = true;
      if (this.warningAlarmSound) {
        this.warningAlarmSound.stop();
        this.warningAlarmSound = null;
      }
    } else {
      this.scene.resume();
      if (this.arcadeTimerEvent) this.arcadeTimerEvent.paused = false;
      if (this.arcadeWarningTimer) this.arcadeWarningTimer.paused = false;
      if (this.arcadeWarningActive && !this.warningAlarmSound) {
        this.warningAlarmSound = audioService.playTwoToneAlarm({
          duration: 999,
          lowFrequency: 820,
          highFrequency: 1100,
          interval: 0.22,
          volume: 0.45
        });
      }
    }
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.isAnimating = true;
    audioService.playGameOver();
    this.clearArcadeWarning();
    this.stopMusicAndTimers();

    // 1. Shake all block containers vigorously
    this.blockContainers.forEach((container) => {
      // Store original X to prevent infinite drift if resize happens
      const originalX = container.x;
      this.tweens.add({
        targets: container,
        x: originalX + Phaser.Math.Between(-3, 3),
        yoyo: true,
        repeat: 7,
        duration: 50,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          container.x = originalX; // restore original X
        }
      });
    });

    // 2. Cascading waterfall tumble down animation
    this.time.delayedCall(450, () => {
      this.blockContainers.forEach((container, id) => {
        const block = this.findBlockById(id);
        // Delay calculations: bottom blocks tumble first, then top blocks follow cascade
        const fallDelay = block 
          ? (this.rows - 1 - block.row) * 50 + Phaser.Math.Between(0, 80)
          : Phaser.Math.Between(0, 300);

        this.tweens.add({
          targets: container,
          y: this.scale.height + 120,
          angle: Phaser.Math.Between(-60, 60),
          scaleX: 0.8,
          scaleY: 0.8,
          alpha: 0.8,
          duration: 800,
          delay: fallDelay,
          ease: 'Back.easeIn',
          onComplete: () => {
            container.destroy();
          }
        });
      });

      // 3. Fade in dark overlay and trigger game over HUD screen
      this.time.delayedCall(1500, () => {
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        overlay.setAlpha(0);
        overlay.setDepth(100);

        this.tweens.add({
          targets: overlay,
          alpha: 1,
          duration: 500,
          onComplete: () => {
            gameEventBus.emit('game:over');
          }
        });
      });
    });
  }

  private stopMusicAndTimers() {
    if (this.arcadeTimerEvent) {
      this.arcadeTimerEvent.destroy();
      this.arcadeTimerEvent = null;
    }
    if (this.arcadeWarningTimer) {
      this.arcadeWarningTimer.destroy();
      this.arcadeWarningTimer = null;
    }
  }

  private triggerCleanSequence() {
    this.isAnimating = true;
    this.clearHoverHighlight();
    audioService.playBonus();
    gameEventBus.emit('score:changed', 500); // 500 pts clean bonus!
    
    // Show big "TEMİZLENDİ / CLEAN!" message in center
    const cleanText = this.add.text(this.gridOffsetX + this.gridWidth / 2, this.gridOffsetY + this.gridHeight / 2, 'TEMİZLENDİ!\n+500 PUAN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#fbbf24',
      align: 'center'
    }).setOrigin(0.5, 0.5).setDepth(10);
    cleanText.setStroke('#000000', 6);
    
    this.tweens.add({
      targets: cleanText,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        cleanText.destroy();
      }
    });

    // Spawn 3 new rows instantly!
    this.spawnNewArcadeRow(true);
    this.time.delayedCall(120, () => this.spawnNewArcadeRow(true));
    this.time.delayedCall(240, () => this.spawnNewArcadeRow(true));

    this.time.delayedCall(450, () => {
      this.isAnimating = false;
      if (this.gameMode === 'arcade') {
        this.checkArcadeWarningState();
      }
    });
  }

  private clearPerfectCleanEffects() {
    this.perfectCleanOpportunityActive = false;

    // Kill pulse tweens and restore scale
    this.blockContainers.forEach((container) => {
      this.tweens.killTweensOf(container);
      container.setScale(1.0);
      container.setAlpha(1.0);
    });

    // Destroy halo graphics
    this.perfectCleanHalos.forEach(halo => {
      this.tweens.killTweensOf(halo);
      halo.destroy();
    });
    this.perfectCleanHalos = [];
  }

  private checkPerfectCleanOpportunity(): boolean {
    let remainingCount = 0;
    let firstBlock: BlockData | null = null;
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const block = this.board[r][c];
        if (block) {
          remainingCount++;
          if (!firstBlock) {
            firstBlock = block;
          }
        }
      }
    }

    if (remainingCount === 0 || !firstBlock) return false;

    // Find connected group starting from the first block
    const group = findConnectedGroup(this.board, firstBlock.row, firstBlock.column);
    
    // If the group size is equal to the total remaining blocks,
    // and group size >= MIN_GROUP_SIZE, then it is a Perfect Clean opportunity!
    return group.length === remainingCount && group.length >= COLLAPSE_CONFIG.MIN_GROUP_SIZE;
  }

  shutdown() {
    if (this.debugCleanHandler) {
      gameEventBus.off('debug:set:clean-state', this.debugCleanHandler);
      this.debugCleanHandler = null;
    }
    if (this.debugComboHandler) {
      gameEventBus.off('debug:set:combo-45', this.debugComboHandler);
      this.debugComboHandler = null;
    }
    if (this.timeExpiredHandler) {
      gameEventBus.off('time:expired', this.timeExpiredHandler);
      this.timeExpiredHandler = null;
    }
    this.stopMusicAndTimers();
    this.clearArcadeWarning();
    if (this.perfectCleanOpportunityActive) {
      this.clearPerfectCleanEffects();
    }
    if (this.warningAlarmSound) {
      this.warningAlarmSound.stop();
      this.warningAlarmSound = null;
    }
    if (this.gridBg) {
      this.gridBg.destroy();
      this.gridBg = null;
    }
    if (this.dangerLine) {
      this.dangerLine.destroy();
      this.dangerLine = null;
    }
    if (this.cleanTimer) {
      this.cleanTimer.destroy();
      this.cleanTimer = null;
    }
    this.blockContainers.clear();
    this.scale.off('resize', this.handleResize, this);
    audioService.stopMusic();
  }
}
