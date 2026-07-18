import Phaser from 'phaser';
import type { TubeState } from '../core/MadLabTypes';
import { MADLAB_CONFIG } from '../config/madlabConfig';

export interface LiquidLayer {
  color: string;
  heightRatio: number; // 1.0 for normal full block, or fractional during pours
}

export class TubeView {
  public readonly id: string;
  public readonly scene: Phaser.Scene;
  public readonly rootContainer: Phaser.GameObjects.Container;

  // Visual sub-layers
  private glassBack: Phaser.GameObjects.Graphics;
  private liquidContainer: Phaser.GameObjects.Container;
  private liquidGraphics: Phaser.GameObjects.Graphics;
  private liquidSurfaceGraphics: Phaser.GameObjects.Graphics;
  private glassOutline: Phaser.GameObjects.Graphics;
  private glassHighlight: Phaser.GameObjects.Graphics;
  private selectionGlow: Phaser.GameObjects.Graphics;
  private bubbleContainer: Phaser.GameObjects.Container;

  // Initial Transform
  private homeX: number = 0;
  private homeY: number = 0;

  // State
  private currentState: TubeState | null = null;

  // Bubble Pool
  private activeBubbles: Phaser.GameObjects.Graphics[] = [];
  private bubblePool: Phaser.GameObjects.Graphics[] = [];
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, scale: number) {
    this.scene = scene;
    this.id = id;
    this.homeX = x;
    this.homeY = y;

    // Create main container
    this.rootContainer = scene.add.container(x, y);
    this.rootContainer.setScale(scale);
    this.rootContainer.setDepth(2);

    // 1. Selection Glow (Behind glass back)
    this.selectionGlow = scene.add.graphics();
    this.rootContainer.add(this.selectionGlow);

    // 2. Glass Back Layer
    this.glassBack = scene.add.graphics();
    this.rootContainer.add(this.glassBack);

    // 3. Group every liquid-related layer in the tube's local space.
    this.liquidContainer = scene.add.container(0, 0);
    this.rootContainer.add(this.liquidContainer);

    // 3a. Liquid Graphics
    this.liquidGraphics = scene.add.graphics();
    this.liquidContainer.add(this.liquidGraphics);

    // 3b. Liquid Surface Graphics (World-oriented reflections)
    this.liquidSurfaceGraphics = scene.add.graphics();
    this.liquidContainer.add(this.liquidSurfaceGraphics);

    // 3c. Bubble Container
    this.bubbleContainer = scene.add.container(0, 0);
    this.liquidContainer.add(this.bubbleContainer);

    // 6. Glass Front Outline
    this.glassOutline = scene.add.graphics();
    this.rootContainer.add(this.glassOutline);

    // 7. Glass Highlight Reflection
    this.glassHighlight = scene.add.graphics();
    this.rootContainer.add(this.glassHighlight);

    // Draw stable layers
    this.drawGlassBack();
    this.drawGlassOutline();
    this.drawGlassHighlight();
  }

  public getHomePosition(): { x: number; y: number } {
    return { x: this.homeX, y: this.homeY };
  }

  public setHomePosition(x: number, y: number) {
    this.homeX = x;
    this.homeY = y;
  }

  public setScale(scale: number) {
    this.rootContainer.setScale(scale);
  }

  // Draw procedural glass shadow and base back tint
  private drawGlassBack() {
    const g = this.glassBack;
    g.clear();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Dark neon glass back tint
    g.fillStyle(0x0e172e, 0.55);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });
  }

  // Draw procedural outer glass outline
  private drawGlassOutline() {
    const g = this.glassOutline;
    g.clear();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Subtle dark shadow outline
    g.lineStyle(4.5, 0x1a264a, 0.45);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });

    // Glass body main outline
    g.lineStyle(2.5, 0x8fa4d9, 0.65);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });
  }

  // Draw vertical highlighted reflection line
  private drawGlassHighlight() {
    const g = this.glassHighlight;
    g.clear();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Thin vertical white-reflection glow on the left wall
    g.lineStyle(1.5, 0xffffff, 0.28);
    g.lineBetween(-w / 2 + 4, -h / 2 + 10, -w / 2 + 4, h / 2 - 20);

    // Minor lip highlight at the tube mouth
    g.lineStyle(1.5, 0xffffff, 0.35);
    g.lineBetween(-w / 2 + 2, -h / 2 + 1, w / 2 - 2, -h / 2 + 1);
  }

  // Convex polygon approximating the tube's inset inner capsule.
  private getLiquidClipPolygon(): Phaser.Math.Vector2[] {
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    const halfWidth = (w - 5) / 2;
    const top = -h / 2 + 2;
    const bottom = h / 2 - 2.5;
    const centerY = bottom - halfWidth;
    const polygon = [
      new Phaser.Math.Vector2(-halfWidth, top),
      new Phaser.Math.Vector2(halfWidth, top),
      new Phaser.Math.Vector2(halfWidth, centerY)
    ];

    // Clockwise in screen coordinates, from the right tangent around the base.
    for (let i = 1; i <= 12; i++) {
      const angle = (Math.PI * i) / 12;
      polygon.push(new Phaser.Math.Vector2(
        Math.cos(angle) * halfWidth,
        centerY + Math.sin(angle) * halfWidth
      ));
    }
    return polygon;
  }

  // Sutherland-Hodgman clipping against the convex capsule polygon.
  private clipToTube(points: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    const clip = this.getLiquidClipPolygon();
    let output = points;

    for (let i = 0; i < clip.length; i++) {
      const a = clip[i];
      const b = clip[(i + 1) % clip.length];
      const input = output;
      output = [];
      if (input.length === 0) break;

      const inside = (p: Phaser.Math.Vector2) =>
        (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -0.001;

      const intersection = (p: Phaser.Math.Vector2, q: Phaser.Math.Vector2) => {
        const rx = q.x - p.x;
        const ry = q.y - p.y;
        const sx = b.x - a.x;
        const sy = b.y - a.y;
        const denominator = rx * sy - ry * sx;
        if (Math.abs(denominator) < 0.000001) return q.clone();
        const t = ((a.x - p.x) * sy - (a.y - p.y) * sx) / denominator;
        return new Phaser.Math.Vector2(p.x + t * rx, p.y + t * ry);
      };

      for (let j = 0; j < input.length; j++) {
        const current = input[j];
        const previous = input[(j + input.length - 1) % input.length];
        const currentInside = inside(current);
        const previousInside = inside(previous);
        if (currentInside) {
          if (!previousInside) output.push(intersection(previous, current));
          output.push(current);
        } else if (previousInside) {
          output.push(intersection(previous, current));
        }
      }
    }
    return output;
  }

  private fillClippedPolygon(g: Phaser.GameObjects.Graphics, points: Phaser.Math.Vector2[]) {
    const clipped = this.clipToTube(points);
    if (clipped.length < 3) return;
    g.beginPath();
    g.moveTo(clipped[0].x, clipped[0].y);
    for (let i = 1; i < clipped.length; i++) g.lineTo(clipped[i].x, clipped[i].y);
    g.closePath();
    g.fill();
  }

  // Standard select raised lift
  public select(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.rootContainer,
        y: this.homeY - 20,
        duration: 160,
        ease: 'Cubic.easeOut',
        onStart: () => {
          this.drawSelectionGlow(true);
        },
        onComplete: () => resolve()
      });
    });
  }

  public deselect(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.rootContainer,
        y: this.homeY,
        duration: 160,
        ease: 'Cubic.easeOut',
        onStart: () => {
          this.drawSelectionGlow(false);
        },
        onComplete: () => resolve()
      });
    });
  }

  // Shakes outline when player makes an illegal move
  public playInvalidShake(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.rootContainer,
        x: this.homeX + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
        onStart: () => {
          // Glow red briefly
          this.drawSelectionGlow(true, 0xff3b30);
        },
        onComplete: () => {
          this.rootContainer.x = this.homeX;
          this.drawSelectionGlow(false);
          resolve();
        }
      });
    });
  }

  // Draws outline neon aura
  private drawSelectionGlow(active: boolean, color = 0x00ffcc) {
    const g = this.selectionGlow;
    g.clear();
    if (!active) return;

    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Glowing aura border
    g.lineStyle(5.5, color, 0.45);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 0, tr: 0, bl: w / 2, br: w / 2 });
  }

  // Instantly renders tube content vertically (theta = 0)
  public renderImmediate(state: TubeState) {
    // Keep animation state independent from the live game model. The model is
    // mutated before the pour timeline starts, but the source must still draw
    // its pre-pour top blocks until they visibly drain.
    this.currentState = {
      ...state,
      blocks: state.blocks.map((block) => ({ ...block }))
    };
    const layers: LiquidLayer[] = this.currentState.blocks.map((block) => ({
      color: block.color,
      heightRatio: 1.0
    }));
    this.renderLiquidLayers(layers, 0);
  }

  public renderLiquidLayersForRotation(rotation: number) {
    if (!this.currentState) return;
    const layers: LiquidLayer[] = this.currentState.blocks.map((block) => ({
      color: block.color,
      heightRatio: 1.0
    }));
    this.renderLiquidLayers(layers, rotation);
  }

  // Core quadrilateral renderer that keeps fluid surfaces horizontal
  public renderLiquidLayers(layers: LiquidLayer[], rotation: number) {
    const lg = this.liquidGraphics;
    const lsg = this.liquidSurfaceGraphics;
    lg.clear();
    lsg.clear();

    if (layers.length === 0) return;

    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    const segmentHeight = (h - 20) / MADLAB_CONFIG.TUBE_CAPACITY;

    // Start drawing from the bottom of the tube capsule (tilted bottom)
    let currentY = h / 2 - 2;

    // Safety clamp rotation angle
    const maxTilt = Phaser.Math.DegToRad(75);
    const clampedRot = Phaser.Math.Clamp(rotation, -maxTilt, maxTilt);
    const tan = Math.tan(clampedRot);

    layers.forEach((layer) => {
      if (layer.heightRatio <= 0) return;

      const layerHeight = layer.heightRatio * segmentHeight;
      const nextY = currentY - layerHeight;

      const colorHex = Phaser.Display.Color.HexStringToColor(layer.color).color & 0xffffff;

      // Local coordinate quadrilateral points
      const botLeftY = currentY + (w / 2) * tan;
      const botRightY = currentY - (w / 2) * tan;
      const topLeftY = nextY + (w / 2) * tan;
      const topRightY = nextY - (w / 2) * tan;

      lg.fillStyle(colorHex, 0.88);
      this.fillClippedPolygon(lg, [
        new Phaser.Math.Vector2(-w / 2, topLeftY),
        new Phaser.Math.Vector2(w / 2, topRightY),
        new Phaser.Math.Vector2(w / 2, botRightY),
        new Phaser.Math.Vector2(-w / 2, botLeftY)
      ]);

      // Topmost fluid surface get shiny reflection lines
      const surfaceHalfWidth = (w - 5) / 2;
      lsg.lineStyle(2.0, 0xffffff, 0.28);
      lsg.lineBetween(
        -surfaceHalfWidth,
        nextY + surfaceHalfWidth * tan,
        surfaceHalfWidth,
        nextY - surfaceHalfWidth * tan
      );

      // Jelly shine highlights inside the vertical columns
      lg.fillStyle(0xffffff, 0.12);
      this.fillClippedPolygon(lg, [
        new Phaser.Math.Vector2(-w / 2 + 5, topLeftY + 2),
        new Phaser.Math.Vector2(-w / 2 + 10, topLeftY + 2),
        new Phaser.Math.Vector2(-w / 2 + 10, botLeftY - 2),
        new Phaser.Math.Vector2(-w / 2 + 5, botLeftY - 2)
      ]);

      // Advance vertical reference to stack layers correctly
      currentY = nextY;
    });
  }

  // Renders a tube as a pour source (shrinks top segments)
  public renderPourSource(pourColor: string, units: number, progress: number, rotation: number) {
    if (!this.currentState) return;

    const layers: LiquidLayer[] = [];
    const totalBlocks = this.currentState.blocks.length;

    // Remaining static blocks
    const staticCount = totalBlocks - units;
    for (let i = 0; i < staticCount; i++) {
      layers.push({
        color: this.currentState.blocks[i].color,
        heightRatio: 1.0
      });
    }

    // Shrinking top block segment
    if (units > 0) {
      layers.push({
        color: pourColor,
        heightRatio: units * (1 - progress)
      });
    }

    this.renderLiquidLayers(layers, rotation);
  }

  // Renders a tube as a pour target (increases top segment)
  public renderPourTarget(pourColor: string, units: number, progress: number, rotation: number) {
    if (!this.currentState) return;

    const layers: LiquidLayer[] = [];

    // currentState is the target's pre-pour snapshot; retain all existing
    // layers and grow the incoming color above them.
    for (let i = 0; i < this.currentState.blocks.length; i++) {
      layers.push({
        color: this.currentState.blocks[i].color,
        heightRatio: 1.0
      });
    }

    // Growing top block segment
    if (units > 0) {
      layers.push({
        color: pourColor,
        heightRatio: units * progress
      });
    }

    this.renderLiquidLayers(layers, rotation);
  }

  // Apply damped wobbles
  public playSurfaceWobble(amplitude: number, frequency: number, damping: number, duration: number) {
    if (!this.currentState || this.currentState.blocks.length === 0) return;

    const start = this.scene.time.now;
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    const segmentHeight = (h - 20) / MADLAB_CONFIG.TUBE_CAPACITY;

    const wobbleEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.currentState) {
          wobbleEvent.destroy();
          return;
        }
        const elapsed = this.scene.time.now - start;
        if (elapsed >= duration) {
          wobbleEvent.destroy();
          // Restore flat
          this.renderImmediate(this.currentState);
          return;
        }

        // wobble oscillation formula
        const offset = Math.sin(elapsed * frequency) * amplitude * Math.exp(-damping * elapsed);

        // Redraw layers with top surface wobbled (adjusting the top Y coordinate boundary)
        const layers: LiquidLayer[] = this.currentState.blocks.map((b) => ({
          color: b.color,
          heightRatio: 1.0
        }));

        const lg = this.liquidGraphics;
        const lsg = this.liquidSurfaceGraphics;
        lg.clear();
        lsg.clear();

        let currentY = h / 2 - 2;
        layers.forEach((layer, idx) => {
          const isTop = idx === layers.length - 1;
          const layerHeight = layer.heightRatio * segmentHeight;
          const nextY = currentY - layerHeight;

          const colorHex = Phaser.Display.Color.HexStringToColor(layer.color).color & 0xffffff;

          // If it is the top layer, add wobble offset to left and right vertices
          const topLeftY = nextY + (isTop ? offset : 0);
          const topRightY = nextY - (isTop ? offset : 0);

          lg.fillStyle(colorHex, 0.88);
          this.fillClippedPolygon(lg, [
            new Phaser.Math.Vector2(-w / 2, topLeftY),
            new Phaser.Math.Vector2(w / 2, topRightY),
            new Phaser.Math.Vector2(w / 2, currentY),
            new Phaser.Math.Vector2(-w / 2, currentY)
          ]);

          lsg.lineStyle(2.0, 0xffffff, 0.28);
          const surfaceHalfWidth = (w - 5) / 2;
          lsg.lineBetween(-surfaceHalfWidth, topLeftY, surfaceHalfWidth, topRightY);

          currentY = nextY;
        });
      }
    });
  }

  // Spawns bubble particles rising within the container
  public startBubbling(colorHexStr: string, interval: number) {
    this.stopBubbling();

    const tintColor = Phaser.Display.Color.HexStringToColor(colorHexStr).color;

    this.bubbleTimer = this.scene.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => {
        if (!this.currentState || this.currentState.blocks.length === 0) return;
        
        // Spawn at bottom/middle of liquid
        const w = MADLAB_CONFIG.TUBE_WIDTH;
        const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
        const segmentHeight = (h - 20) / MADLAB_CONFIG.TUBE_CAPACITY;
        
        const liquidTopY = h / 2 - 2 - this.currentState.blocks.length * segmentHeight;
        const startY = Phaser.Math.Between(liquidTopY + 15, h / 2 - 15);
        const startX = Phaser.Math.Between(-w / 2 + 8, w / 2 - 8);

        const bubble = this.acquireBubble();
        bubble.setPosition(startX, startY);
        bubble.setScale(Phaser.Math.FloatBetween(0.12, 0.24));
        bubble.setAlpha(Phaser.Math.FloatBetween(0.4, 0.75));
        
        // Draw bubble circle
        bubble.clear();
        bubble.fillStyle(0xffffff, 1.0);
        bubble.fillCircle(0, 0, 8);
        bubble.lineStyle(1.5, tintColor, 0.9);
        bubble.strokeCircle(0, 0, 8);

        this.activeBubbles.push(bubble);
      }
    });
  }

  public stopBubbling() {
    if (this.bubbleTimer) {
      this.bubbleTimer.destroy();
      this.bubbleTimer = null;
    }
  }

  // Update bubble translation and cleanup
  public updateBubbles(delta: number) {
    if (!this.currentState || this.currentState.blocks.length === 0) {
      this.releaseAllBubbles();
      return;
    }

    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    const segmentHeight = (h - 20) / MADLAB_CONFIG.TUBE_CAPACITY;
    const liquidTopY = h / 2 - 2 - this.currentState.blocks.length * segmentHeight;

    for (let i = this.activeBubbles.length - 1; i >= 0; i--) {
      const b = this.activeBubbles[i];
      
      // Rise up
      b.y -= 1.15 * delta * 0.06;
      // Drift sideways
      b.x += Math.sin(this.scene.time.now * 0.012 + b.y) * 0.25;
      b.x = Phaser.Math.Clamp(b.x, -MADLAB_CONFIG.TUBE_WIDTH / 2 + 7, MADLAB_CONFIG.TUBE_WIDTH / 2 - 7);

      // Fade out close to the liquid surface
      if (b.y <= liquidTopY + 12) {
        b.alpha -= 0.1;
        b.scaleX -= 0.01;
        b.scaleY -= 0.01;
      }

      // Remove if exceeded surface or scale collapsed
      if (b.y <= liquidTopY || b.alpha <= 0 || b.scaleX <= 0) {
        this.activeBubbles.splice(i, 1);
        this.releaseBubble(b);
      }
    }
  }

  // Bubble Pool handlers
  private acquireBubble(): Phaser.GameObjects.Graphics {
    let b = this.bubblePool.pop();
    if (!b) {
      b = this.scene.add.graphics();
      this.bubbleContainer.add(b);
    }
    b.setVisible(true);
    b.setActive(true);
    return b;
  }

  private releaseBubble(b: Phaser.GameObjects.Graphics) {
    b.setVisible(false);
    b.setActive(false);
    b.clear();
    this.bubblePool.push(b);
  }

  private releaseAllBubbles() {
    this.activeBubbles.forEach((b) => this.releaseBubble(b));
    this.activeBubbles = [];
  }

  // Returns mouth coordinates in global coordinate frame
  public getMouthWorldPosition(): Phaser.Math.Vector2 {
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    // Local mouth center is at (0, -h/2)
    const localPt = new Phaser.Math.Vector2(0, -h / 2);
    const matrix = this.rootContainer.getWorldTransformMatrix();
    const pt = matrix.transformPoint(localPt.x, localPt.y);
    return new Phaser.Math.Vector2(pt.x, pt.y);
  }

  // Returns top liquid surface center in global coordinate frame
  public getLiquidSurfaceWorldPosition(): Phaser.Math.Vector2 {
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;
    const segmentHeight = (h - 20) / MADLAB_CONFIG.TUBE_CAPACITY;
    const count = this.currentState ? this.currentState.blocks.length : 0;
    const topY = h / 2 - 2 - count * segmentHeight;

    const localPt = new Phaser.Math.Vector2(0, topY);
    const matrix = this.rootContainer.getWorldTransformMatrix();
    const pt = matrix.transformPoint(localPt.x, localPt.y);
    return new Phaser.Math.Vector2(pt.x, pt.y);
  }

  public destroy() {
    this.stopBubbling();
    this.releaseAllBubbles();
    this.bubblePool.forEach((b) => b.destroy());
    this.bubblePool = [];
    this.rootContainer.destroy();
  }
}
