import Phaser from 'phaser';
import type { TubeState } from '../core/MadLabTypes';
import { 
  isValidMove, 
  executePour, 
  isGameComplete,
  getPourableBlocksCount,
  cloneTubes
} from '../core/MadLabEngine';
import { madlabEventBus } from '../utils/madlabEventBus';
import { MADLAB_CONFIG } from '../config/madlabConfig';
import { TubeView } from './TubeView';
import { LiquidStreamView } from './LiquidStreamView';
import { LiquidAnimationController } from './LiquidAnimationController';

export class MadLabScene extends Phaser.Scene {
  private tubesData: TubeState[] = [];
  private selectedTubeId: string | null = null;
  private isAnimating: boolean = false;

  // Visual collections
  private tubeViews = new Map<string, TubeView>();
  private stream: LiquidStreamView | null = null;
  private animationController: LiquidAnimationController | null = null;

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

    if (this.animationController) {
      this.animationController.cancelActiveAnimation();
    }

    this.tubeViews.forEach((view) => view.destroy());
    this.tubeViews.clear();
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

    // Initialize stream and controller
    this.stream = new LiquidStreamView(this);
    this.animationController = new LiquidAnimationController(this, this.stream);

    this.setupLayout();
    this.drawScene();

    // Notify React that scene is ready
    madlabEventBus.emit('scene:ready');

    // Handle resize events
    this.scale.on('resize', this.handleResize, this);

    // Clean up sounds and resources on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.animationController) {
        this.animationController.destroy();
        this.animationController = null;
      }
      if (this.stream) {
        this.stream.destroy();
        this.stream = null;
      }
      this.tubeViews.forEach((view) => view.destroy());
      this.tubeViews.clear();
    });
  }

  update(time: number, delta: number) {
    if (this.stream) {
      this.stream.update(time, delta);
    }
    this.tubeViews.forEach((view) => {
      view.updateBubbles(delta);
    });
  }

  private handleResize() {
    this.setupLayout();
    
    // Reposition all tubes to their correct coordinates
    this.tubesData.forEach((t, idx) => {
      const { x, y } = this.calculateTubePosition(idx);
      const view = this.tubeViews.get(t.id);
      if (view) {
        view.setHomePosition(x, y);
        if (!this.isAnimating) {
          view.rootContainer.setPosition(x, y);
        }
        view.setScale(this.scaleFactor);
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
      
      const tubeView = new TubeView(this, tube.id, x, y, this.scaleFactor);
      tubeView.renderImmediate(tube);

      // Make select interactive zone
      const w = MADLAB_CONFIG.TUBE_WIDTH;
      const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
      const zone = this.add.zone(
        0, 
        -h / 2, 
        w + 15, 
        h + 20
      );
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.handleTubeClick(tube.id));
      tubeView.rootContainer.add(zone);

      this.tubeViews.set(tube.id, tubeView);
    });
  }

  private handleTubeClick(tubeId: string) {
    if (this.isAnimating) return;

    const clickedTube = this.tubesData.find(t => t.id === tubeId);
    if (!clickedTube) return;

    if (this.selectedTubeId === null) {
      // First select: must have compounds to pour
      if (clickedTube.blocks.length > 0) {
        this.selectedTubeId = tubeId;
        const view = this.tubeViews.get(tubeId);
        if (view) {
          madlabEventBus.emit('audio:play', 'tube_select');
          view.select();
        }
      }
    } else {
      // Second select: deselect if clicking the same
      if (this.selectedTubeId === tubeId) {
        const view = this.tubeViews.get(tubeId);
        if (view) {
          madlabEventBus.emit('audio:play', 'tube_select');
          view.deselect();
        }
        this.selectedTubeId = null;
      } else {
        // Execute pour validate
        const sourceTube = this.tubesData.find(t => t.id === this.selectedTubeId);
        const destTube = clickedTube;

        if (sourceTube && isValidMove(sourceTube, destTube)) {
          this.executePourAnimation(sourceTube, destTube);
        } else {
          // Invalid move feedback
          const srcView = this.tubeViews.get(this.selectedTubeId);
          if (srcView) {
            srcView.playInvalidShake();
          }
          this.selectedTubeId = null;
        }
      }
    }
  }

  private executePourAnimation(source: TubeState, dest: TubeState) {
    const srcView = this.tubeViews.get(source.id);
    const destView = this.tubeViews.get(dest.id);
    if (!srcView || !destView || !this.animationController) return;

    // Get parameters before state mutation
    const count = getPourableBlocksCount(source, dest);
    const pourColor = source.blocks[source.blocks.length - 1].color;

    // Clone states before they are mutated for the animation controller
    const sourceStateAfter = cloneTubes([source])[0];
    const destStateAfter = cloneTubes([dest])[0];
    executePour([sourceStateAfter, destStateAfter], source.id, dest.id);

    // Apply actual pour logic to scene tubesData
    executePour(this.tubesData, source.id, dest.id);

    this.isAnimating = true;

    this.animationController.playPour({
      source: srcView,
      target: destView,
      color: pourColor,
      units: count,
      sourceStateAfter,
      targetStateAfter: destStateAfter
    }).then(() => {
      this.isAnimating = false;
      this.selectedTubeId = null;

      // Emit moves to React HUD
      madlabEventBus.emit('moves:updated');

      // Check level win
      if (isGameComplete(this.tubesData)) {
        this.celebrateSuccess();
      }
    }).catch(() => {
      this.isAnimating = false;
      this.selectedTubeId = null;
    });
  }

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

  public syncTubes(newTubes: TubeState[]) {
    if (this.animationController) {
      this.animationController.cancelActiveAnimation();
    }
    this.isAnimating = false;
    this.selectedTubeId = null;

    this.tubesData = newTubes;
    this.tubesData.forEach((tube) => {
      const view = this.tubeViews.get(tube.id);
      if (view) {
        view.renderImmediate(tube);
        view.deselect(); // clean selection raises and outline glows
      }
    });
  }
}
