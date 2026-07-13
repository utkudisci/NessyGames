import Phaser from 'phaser';
import type { TubeState } from '../core/MadLabTypes';
import { 
  isValidMove, 
  executePour, 
  isGameComplete 
} from '../core/MadLabEngine';
import { madlabEventBus } from '../utils/madlabEventBus';
import { MADLAB_CONFIG } from '../config/madlabConfig';

export class MadLabScene extends Phaser.Scene {
  private tubesData: TubeState[] = [];
  private selectedTubeId: string | null = null;
  private isAnimating: boolean = false;

  // Visual collections
  private tubeContainers = new Map<string, Phaser.GameObjects.Container>();
  private liquidGraphics = new Map<string, Phaser.GameObjects.Graphics>();
  private tubeOutlines = new Map<string, Phaser.GameObjects.Graphics>();
  private bubbleEmitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();

  // Layout parameters
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private scaleFactor: number = 1;

  constructor() {
    super('MadLabScene');
  }

  init(data: { tubes?: TubeState[] }) {
    this.tubesData = data.tubes || [];
    this.selectedTubeId = null;
    this.isAnimating = false;
    this.tubeContainers.clear();
    this.liquidGraphics.clear();
    this.tubeOutlines.clear();
    this.bubbleEmitters.clear();
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b1329');

    // Make circle texture for bubbles/confetti if not exists
    if (!this.textures.exists('particle_dot')) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture('particle_dot', 16, 16);
      graphics.destroy();
    }

    this.setupLayout();
    this.drawScene();

    // Notify React that scene is ready
    madlabEventBus.emit('scene:ready');

    // Handle resize events
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    this.setupLayout();
    
    // Reposition all tubes to their correct coordinates
    this.tubesData.forEach((t, idx) => {
      const { x, y } = this.calculateTubePosition(idx);
      const container = this.tubeContainers.get(t.id);
      if (container) {
        container.setPosition(x, y);
        container.setScale(this.scaleFactor);
      }
    });
  }

  private setupLayout() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Determine scale based on screen dimensions
    const colsCount = this.tubesData.length <= 6 ? this.tubesData.length : Math.ceil(this.tubesData.length / 2);
    const rowsCount = this.tubesData.length <= 6 ? 1 : 2;

    const totalWidthNeeded = colsCount * (MADLAB_CONFIG.TUBE_WIDTH + MADLAB_CONFIG.TUBE_SPACING) - MADLAB_CONFIG.TUBE_SPACING;
    const totalHeightNeeded = rowsCount * (MADLAB_CONFIG.MAX_TUBE_HEIGHT + 100);

    const scaleX = (width * 0.85) / totalWidthNeeded;
    const scaleY = (height * 0.75) / totalHeightNeeded;
    this.scaleFactor = Phaser.Math.Clamp(Math.min(scaleX, scaleY), 0.5, 1.2);

    const scaledWidth = totalWidthNeeded * this.scaleFactor;
    const scaledHeight = totalHeightNeeded * this.scaleFactor;

    this.gridOffsetX = (width - scaledWidth) / 2 + (MADLAB_CONFIG.TUBE_WIDTH * this.scaleFactor) / 2;
    this.gridOffsetY = (height - scaledHeight) / 2 + (MADLAB_CONFIG.MAX_TUBE_HEIGHT * this.scaleFactor) / 2 + 30;
  }

  private calculateTubePosition(index: number): { x: number; y: number } {
    const colsCount = this.tubesData.length <= 6 ? this.tubesData.length : Math.ceil(this.tubesData.length / 2);
    
    let col = index;
    let row = 0;

    if (this.tubesData.length > 6) {
      if (index >= colsCount) {
        col = index - colsCount;
        row = 1;
      }
    }

    const x = this.gridOffsetX + col * (MADLAB_CONFIG.TUBE_WIDTH + MADLAB_CONFIG.TUBE_SPACING) * this.scaleFactor;
    const y = this.gridOffsetY + row * (MADLAB_CONFIG.MAX_TUBE_HEIGHT + 100) * this.scaleFactor;

    return { x, y };
  }

  private drawScene() {
    this.tubesData.forEach((tube, index) => {
      const { x, y } = this.calculateTubePosition(index);
      const container = this.add.container(x, y);
      container.setScale(this.scaleFactor);
      container.setData('originalX', x);
      container.setData('originalY', y);
      container.setData('id', tube.id);

      // Create Tube Outline graphics
      const outline = this.add.graphics();
      this.drawTubeOutline(outline, 0, 0);
      container.add(outline);
      this.tubeOutlines.set(tube.id, outline);

      // Create Liquid graphics
      const liquid = this.add.graphics();
      container.add(liquid);
      this.liquidGraphics.set(tube.id, liquid);

      // Draw initial liquid state
      this.drawLiquid(tube, liquid);

      // Make select interactive zone
      const zone = this.add.zone(
        0, 
        -MADLAB_CONFIG.MAX_TUBE_HEIGHT / 2, 
        MADLAB_CONFIG.TUBE_WIDTH + 15, 
        MADLAB_CONFIG.MAX_TUBE_HEIGHT + 20
      );
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.handleTubeClick(tube.id));
      container.add(zone);

      this.tubeContainers.set(tube.id, container);
    });
  }

  // Draw procedural glass outline with modern rounded bottom
  private drawTubeOutline(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.clear();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Draw glass shadow
    g.lineStyle(4, 0x1f2d5a, 0.4);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });

    // Glass body
    g.lineStyle(3, 0xffffff, 0.85);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });

    // Inner highlight reflection
    g.lineStyle(1.5, 0xffffff, 0.35);
    g.lineBetween(x - w / 2 + 5, y - h / 2 + 10, x - w / 2 + 5, y + h / 2 - 25);
  }

  // Render liquid layers
  private drawLiquid(tube: TubeState, g: Phaser.GameObjects.Graphics) {
    g.clear();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    
    // Height per block segment
    const segmentH = (h - 20) / tube.capacity;

    tube.blocks.forEach((block, idx) => {
      const colorHex = Phaser.Display.Color.HexStringToColor(block.color).color;
      g.fillStyle(colorHex, 0.9);

      // Calculate vertical Y bounds inside the tube
      const blockY = h / 2 - (idx + 1) * segmentH;

      // Bottom layer should follow tube curvature perfectly
      if (idx === 0) {
        g.fillRoundedRect(
          -w / 2 + 2, 
          blockY, 
          w - 4, 
          segmentH + 8, // slight overflow to prevent gap at the bottom curves
          { tl: 2, tr: 2, bl: w / 2 - 2, br: w / 2 - 2 }
        );
      } else {
        g.fillRoundedRect(
          -w / 2 + 2, 
          blockY, 
          w - 4, 
          segmentH, 
          { tl: 2, tr: 2, bl: 2, br: 2 }
        );
      }

      // Add a shine layer to make compounds look jelly-like
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(-w / 2 + 5, blockY + 2, 6, segmentH - 4);
    });
  }

  private handleTubeClick(tubeId: string) {
    if (this.isAnimating) return;

    // Reacting to click
    const clickedTube = this.tubesData.find(t => t.id === tubeId);
    if (!clickedTube) return;

    madlabEventBus.emit('audio:play', 'tube_select');

    if (this.selectedTubeId === null) {
      // First select: must have compounds to pour
      if (clickedTube.blocks.length > 0) {
        this.selectedTubeId = tubeId;
        this.animateSelection(tubeId, true);
      }
    } else {
      // Second select: deselect if clicking the same
      if (this.selectedTubeId === tubeId) {
        this.animateSelection(tubeId, false);
        this.selectedTubeId = null;
      } else {
        // Execute pour validate
        const sourceTube = this.tubesData.find(t => t.id === this.selectedTubeId);
        const destTube = clickedTube;

        if (sourceTube && isValidMove(sourceTube, destTube)) {
          this.executePourAnimation(sourceTube, destTube);
        } else {
          // Invalid move feedback
          this.animateSelection(this.selectedTubeId, false);
          this.animateInvalidMove(tubeId);
          this.selectedTubeId = null;
        }
      }
    }
  }

  private animateSelection(tubeId: string, isSelected: boolean) {
    const container = this.tubeContainers.get(tubeId);
    const outline = this.tubeOutlines.get(tubeId);
    if (!container || !outline) return;

    const originalY = container.getData('originalY');

    this.tweens.add({
      targets: container,
      y: isSelected ? originalY - 20 : originalY,
      duration: 180,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        // Redraw outline with high glow color if selected
        if (isSelected) {
          outline.clear();
          const w = MADLAB_CONFIG.TUBE_WIDTH;
          const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
          // Outer glow ring
          outline.lineStyle(6, 0x00ffcc, 0.45);
          outline.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });
          // Core outline
          outline.lineStyle(3, 0xffffff, 1.0);
          outline.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });
        } else {
          this.drawTubeOutline(outline, 0, 0);
        }
      }
    });
  }

  private animateInvalidMove(tubeId: string) {
    const container = this.tubeContainers.get(tubeId);
    if (!container) return;

    madlabEventBus.emit('audio:play', 'invalid_move');

    const originalX = container.getData('originalX');

    this.tweens.add({
      targets: container,
      x: originalX + 6,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        container.x = originalX;
      }
    });
  }

  private executePourAnimation(source: TubeState, dest: TubeState) {
    this.isAnimating = true;

    const sourceContainer = this.tubeContainers.get(source.id);
    const destContainer = this.tubeContainers.get(dest.id);
    if (!sourceContainer || !destContainer) return;

    // Remove selection glow from source immediately
    this.animateSelection(source.id, false);

    // Run core TS pour logic to update state
    const pourColor = source.blocks[source.blocks.length - 1].color;
    
    // Perform pour logic state updates
    executePour(this.tubesData, source.id, dest.id);

    madlabEventBus.emit('audio:play', 'liquid_pour');

    // Start coordinates
    const startX = sourceContainer.getData('originalX');
    const startY = sourceContainer.getData('originalY');
    
    // Lip pouring point details
    // If source is on left, pour right. If source is on right, pour left.
    const isPouringRight = sourceContainer.x < destContainer.x;
    const angleTarget = isPouringRight ? 85 : -85;
    
    // Position offset to align the lip of source tube exactly at the top lip of dest tube
    const offsetLipX = isPouringRight 
      ? destContainer.x - (MADLAB_CONFIG.TUBE_WIDTH + 8) * this.scaleFactor
      : destContainer.x + (MADLAB_CONFIG.TUBE_WIDTH + 8) * this.scaleFactor;
    const offsetLipY = destContainer.y - (MADLAB_CONFIG.MAX_TUBE_HEIGHT + 10) * this.scaleFactor;

    // Path calculation for pour animation
    this.tweens.add({
      targets: sourceContainer,
      x: offsetLipX,
      y: offsetLipY,
      angle: angleTarget,
      duration: 350,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Draw stream line
        const streamGraphics = this.add.graphics();
        streamGraphics.setDepth(5);
        
        const streamColor = Phaser.Display.Color.HexStringToColor(pourColor).color;
        streamGraphics.lineStyle(8 * this.scaleFactor, streamColor, 1.0);

        const lipX = isPouringRight
          ? offsetLipX + (MADLAB_CONFIG.TUBE_WIDTH / 2) * this.scaleFactor
          : offsetLipX - (MADLAB_CONFIG.TUBE_WIDTH / 2) * this.scaleFactor;
        const lipY = offsetLipY;

        const streamTargetX = destContainer.x;
        const streamTargetY = destContainer.y - (MADLAB_CONFIG.MAX_TUBE_HEIGHT / 2 - 20) * this.scaleFactor;

        streamGraphics.lineBetween(lipX, lipY, streamTargetX, streamTargetY);

        // Add satisfying bubbles inside dest tube during pour
        const emitter = this.add.particles(0, 0, 'particle_dot', {
          x: { min: destContainer.x - 15 * this.scaleFactor, max: destContainer.x + 15 * this.scaleFactor },
          y: destContainer.y + (MADLAB_CONFIG.MAX_TUBE_HEIGHT / 2 - 10) * this.scaleFactor,
          lifespan: { min: 300, max: 700 },
          speedY: { min: -100 * this.scaleFactor, max: -300 * this.scaleFactor },
          scale: { start: 0.15 * this.scaleFactor, end: 0 },
          alpha: { start: 0.8, end: 0 },
          tint: streamColor,
          frequency: 30,
          quantity: 2
        });
        emitter.setDepth(1);

        // Animate the actual liquid redraws
        this.time.delayedCall(400, () => {
          streamGraphics.destroy();
          emitter.destroy();

          // Redraw liquids with updated state
          const srcLiquid = this.liquidGraphics.get(source.id);
          const destLiquid = this.liquidGraphics.get(dest.id);
          if (srcLiquid) this.drawLiquid(source, srcLiquid);
          if (destLiquid) this.drawLiquid(dest, destLiquid);

          // Return source tube back to original position
          this.tweens.add({
            targets: sourceContainer,
            x: startX,
            y: startY,
            angle: 0,
            duration: 350,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              this.selectedTubeId = null;
              this.isAnimating = false;

              // Emit move data to React UI
              madlabEventBus.emit('moves:updated');

              // Check game complete
              if (isGameComplete(this.tubesData)) {
                this.celebrateSuccess();
              }
            }
          });
        });
      }
    });
  }

  // Celebrates board completion
  private celebrateSuccess() {
    madlabEventBus.emit('audio:play', 'level_success');
    madlabEventBus.emit('game:complete');

    // Confetti particles explosion
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const emitter = this.add.particles(centerX, centerY, 'particle_dot', {
      lifespan: 1200,
      speed: { min: 200, max: 500 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1.0, end: 0 },
      tint: [0x00ffcc, 0xff00ff, 0xffff00, 0x00ffff, 0xff9900],
      quantity: 80,
      emitting: false
    });
    emitter.setDepth(15);
    emitter.explode(80);

    // Screen shake
    this.cameras.main.shake(400, 0.01);
  }

  // Method to redraw everything when states are mutated from React (like Undo, Hint, Restart)
  public syncTubes(newTubes: TubeState[]) {
    this.tubesData = newTubes;
    this.tubesData.forEach((tube) => {
      const liquid = this.liquidGraphics.get(tube.id);
      if (liquid) {
        this.drawLiquid(tube, liquid);
      }
      
      // Clean selection outline if selected state resets
      const outline = this.tubeOutlines.get(tube.id);
      if (outline) {
        this.drawTubeOutline(outline, 0, 0);
      }
    });
  }
}
