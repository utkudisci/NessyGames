import Phaser from 'phaser';
import type { TubeView } from './TubeView';
import type { LiquidStreamView } from './LiquidStreamView';
import { madlabAudio } from '../utils/madlabAudio';
import { MADLAB_CONFIG } from '../config/madlabConfig';
import type { TubeState } from '../core/MadLabTypes';

export interface PourCommand {
  source: TubeView;
  target: TubeView;
  color: string;
  units: number;
  sourceStateAfter: TubeState;
  targetStateAfter: TubeState;
}

export class LiquidAnimationController {
  private scene: Phaser.Scene;
  private stream: LiquidStreamView;
  private activeAbortController: AbortController | null = null;
  private busy: boolean = false;

  // Active procedural sound handle
  private activePourSound: { setIntensity: (v: number) => void; stop: () => void } | null = null;

  constructor(scene: Phaser.Scene, stream: LiquidStreamView) {
    this.scene = scene;
    this.stream = stream;
  }

  public get isBusy(): boolean {
    return this.busy;
  }

  public cancelActiveAnimation() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  public playPour(command: PourCommand): Promise<void> {
    this.cancelActiveAnimation();
    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    this.busy = true;

    return new Promise<void>(async (resolve, reject) => {
      // Abort signal listener for clean reject/cancel
      const onAbort = () => {
        this.cleanup(command);
        reject(new Error('Animation Aborted'));
      };

      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort);

      try {
        await this.executePourTimeline(command, signal);
        signal.removeEventListener('abort', onAbort);
        this.busy = false;
        resolve();
      } catch (err) {
        signal.removeEventListener('abort', onAbort);
        this.cleanup(command);
        this.busy = false;
        reject(err);
      }
    });
  }

  private async executePourTimeline(command: PourCommand, signal: AbortSignal): Promise<void> {
    const { source, target, color, units } = command;
    const scaleFactor = source.rootContainer.scaleX;

    // 1. Lift Source Tube up (160ms)
    await this.wrapTween(this.scene, {
      targets: source.rootContainer,
      y: source.getHomePosition().y - 22 * scaleFactor,
      duration: 160,
      ease: 'Cubic.easeOut'
    }, signal);

    // 2. Bezier path travel to pour position (300ms)
    const isPouringRight = source.rootContainer.x < target.rootContainer.x;
    const direction = isPouringRight ? 1 : -1;
    const pourAngle = Phaser.Math.DegToRad(62) * direction;

    const destMouth = target.getMouthWorldPosition();
    const w = MADLAB_CONFIG.TUBE_WIDTH;
    const h = MADLAB_CONFIG.MAX_TUBE_HEIGHT;

    // Align source lip to target mouth
    const lipLocalX = (w / 2 - 3) * direction;
    const lipLocalY = -h / 2;

    const cos = Math.cos(pourAngle);
    const sin = Math.sin(pourAngle);

    const lipRotatedX = (lipLocalX * cos - lipLocalY * sin) * scaleFactor;
    const lipRotatedY = (lipLocalX * sin + lipLocalY * cos) * scaleFactor;

    const targetX = destMouth.x - lipRotatedX;
    const targetY = destMouth.y - lipRotatedY - 14 * scaleFactor;

    const startPt = new Phaser.Math.Vector2(source.rootContainer.x, source.rootContainer.y);
    const endPt = new Phaser.Math.Vector2(targetX, targetY);
    const controlPt = new Phaser.Math.Vector2(
      (startPt.x + endPt.x) / 2,
      Math.min(startPt.y, endPt.y) - 90 * scaleFactor
    );

    const pathProgress = { val: 0 };
    await this.wrapTween(this.scene, {
      targets: pathProgress,
      val: 1,
      duration: 320,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        const t = pathProgress.val;
        const x = (1 - t) * (1 - t) * startPt.x + 2 * (1 - t) * t * controlPt.x + t * t * endPt.x;
        const y = (1 - t) * (1 - t) * startPt.y + 2 * (1 - t) * t * controlPt.y + t * t * endPt.y;
        source.rootContainer.setPosition(x, y);
      }
    }, signal);

    // 3. Rotate / Tilt Source Tube (240ms)
    // Synchronize fluid leveling calculations with rotation onUpdate
    await this.wrapTween(this.scene, {
      targets: source.rootContainer,
      rotation: pourAngle,
      duration: 240,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Redraw fluid horizontal relative to rotation angle
        source.renderLiquidLayersForRotation(source.rootContainer.rotation);
      }
    }, signal);

    if (signal.aborted) return;

    // 4. Spawn Stream (120ms)
    this.stream.start({
      color,
      getSourcePoint: () => source.getMouthWorldPosition(),
      getTargetPoint: () => target.getLiquidSurfaceWorldPosition(),
      baseWidth: 7 * scaleFactor
    });

    const streamProgress = { val: 0 };
    await this.wrapTween(this.scene, {
      targets: streamProgress,
      val: 1,
      duration: 120,
      ease: 'Linear',
      onUpdate: () => {
        this.stream.setProgress(streamProgress.val);
      }
    }, signal);

    if (signal.aborted) return;

    // 5. Sound and wobble impact
    this.activePourSound = madlabAudio.startPourSound({ volume: 0.25 });
    target.playSurfaceWobble(w * 0.04, 0.022, 0.005, 1200);
    target.startBubbling(color, 110);

    // Spawn tiny splash particles on target surface
    this.createSplashParticles(destMouth.x, target.getLiquidSurfaceWorldPosition().y, color, scaleFactor);

    // 6. Level transition shift (draining/filling heights)
    const pourDuration = Phaser.Math.Clamp(400 + units * 180, 500, 1100);
    const pourProgress = { val: 0 };

    await this.wrapTween(this.scene, {
      targets: pourProgress,
      val: 1,
      duration: pourDuration,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        source.renderPourSource(color, units, pourProgress.val, source.rootContainer.rotation);
        target.renderPourTarget(color, units, pourProgress.val, target.rootContainer.rotation);

        const volumeRatio = Math.sin(pourProgress.val * Math.PI);
        if (this.activePourSound) {
          this.activePourSound.setIntensity(volumeRatio * 0.8 + 0.2);
        }
        this.stream.setIntensity(volumeRatio * 0.6 + 0.4);
      }
    }, signal);

    if (signal.aborted) return;

    // 7. Stream Fade-out & Bubbles stop
    target.stopBubbling();
    if (this.activePourSound) {
      this.activePourSound.stop();
      this.activePourSound = null;
    }

    // Shrink the Bezier stream
    await this.stream.stop();

    if (signal.aborted) return;

    // 8. Son Damla (Trailing Drop) Animation (160ms)
    await this.playTrailingDrop(source.getMouthWorldPosition(), target.getLiquidSurfaceWorldPosition(), color, scaleFactor, signal);

    // 9. Tilt Source Tube back to upright (240ms)
    await this.wrapTween(this.scene, {
      targets: source.rootContainer,
      rotation: 0,
      duration: 240,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        source.renderPourSource(color, units, 1.0, source.rootContainer.rotation);
      }
    }, signal);

    // 10. Travel back to home position (300ms)
    const homePos = source.getHomePosition();
    const returnProgress = { val: 0 };

    await this.wrapTween(this.scene, {
      targets: returnProgress,
      val: 1,
      duration: 300,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        const t = returnProgress.val;
        const x = (1 - t) * (1 - t) * source.rootContainer.x + 2 * (1 - t) * t * controlPt.x + t * t * homePos.x;
        const y = (1 - t) * (1 - t) * source.rootContainer.y + 2 * (1 - t) * t * controlPt.y + t * t * homePos.y;
        source.rootContainer.setPosition(x, y);
      }
    }, signal);

    // 11. Replace click tap
    madlabAudio.playGlassTap();
    source.renderImmediate(command.sourceStateAfter);
    target.renderImmediate(command.targetStateAfter);
  }

  // Visual splash droplets
  private createSplashParticles(x: number, y: number, colorHex: string, scale: number) {
    const colorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
    for (let i = 0; i < 4; i++) {
      const drop = this.scene.add.graphics();
      drop.fillStyle(colorInt, 0.7);
      drop.fillCircle(0, 0, 3 * scale);
      drop.setPosition(x + Phaser.Math.Between(-8, 8), y);

      this.scene.tweens.add({
        targets: drop,
        x: drop.x + Phaser.Math.Between(-15, 15),
        y: y - Phaser.Math.Between(10, 25),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(200, 320),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy()
      });
    }
  }

  // Animates the final trailing drip falling
  private playTrailingDrop(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    colorHex: string,
    scale: number,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const colorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
      const drip = this.scene.add.graphics();
      drip.fillStyle(colorInt, 0.9);
      drip.fillCircle(0, 0, 4.5 * scale);
      drip.setPosition(start.x, start.y);

      this.scene.tweens.add({
        targets: drip,
        x: end.x,
        y: end.y,
        scaleY: 1.25,
        scaleX: 0.85,
        duration: 160,
        ease: 'Quad.easeIn',
        onComplete: () => {
          drip.destroy();
          if (!signal.aborted) {
            // Play drip impact
            madlabAudio.playDrip();
            this.createRipple(end.x, end.y, colorInt, scale);
          }
          resolve();
        }
      });
    });
  }

  // Circular surface ripple
  private createRipple(x: number, y: number, colorInt: number, scale: number) {
    const ripple = this.scene.add.graphics();
    ripple.lineStyle(1.5, colorInt, 0.8);
    ripple.strokeEllipse(0, 0, (MADLAB_CONFIG.TUBE_WIDTH - 10) * scale, 4 * scale);
    ripple.setPosition(x, y);
    ripple.setScale(0.2);

    this.scene.tweens.add({
      targets: ripple,
      scaleX: 0.8,
      scaleY: 0.6,
      alpha: 0,
      duration: 250,
      ease: 'Sine.easeOut',
      onComplete: () => ripple.destroy()
    });
  }

  // Coordinated Phaser Tween wrapper that supports cancel signal rejects
  private wrapTween(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const tween = scene.tweens.add({
        ...config,
        onComplete: (t, targets) => {
          if (config.onComplete) config.onComplete(t, targets);
          resolve();
        }
      });

      // Listen to AbortSignal
      const abortHandler = () => {
        tween.stop();
        reject(new Error('Aborted'));
      };
      signal.addEventListener('abort', abortHandler);
    });
  }

  // Standard cleanup on cancellations
  private cleanup(command: PourCommand) {
    if (this.activePourSound) {
      this.activePourSound.stop();
      this.activePourSound = null;
    }
    this.stream.setProgress(0);
    this.stream.setIntensity(0);
    this.stream.stop();

    // Revert tubes containers to stable home values
    const srcHome = command.source.getHomePosition();
    command.source.rootContainer.setPosition(srcHome.x, srcHome.y);
    command.source.rootContainer.setRotation(0);
    command.source.renderImmediate(command.sourceStateAfter);

    const destHome = command.target.getHomePosition();
    command.target.rootContainer.setPosition(destHome.x, destHome.y);
    command.target.rootContainer.setRotation(0);
    command.target.renderImmediate(command.targetStateAfter);
    command.target.stopBubbling();
  }

  public destroy() {
    this.cancelActiveAnimation();
  }
}
