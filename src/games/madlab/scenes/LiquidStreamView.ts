import Phaser from 'phaser';

export class LiquidStreamView {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  // Stream parameters
  private colorHex: string = '#ffffff';
  private getSourcePoint!: () => Phaser.Math.Vector2;
  private getTargetPoint!: () => Phaser.Math.Vector2;
  private baseWidth: number = 6;
  
  // Dynamic controls
  private progress: number = 0; // 0 to 1 (expansion progress)
  private intensity: number = 0; // 0 to 1 (thickness/fade ratio)

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);
    this.graphics.setVisible(false);
  }

  public start(options: {
    color: string;
    getSourcePoint: () => Phaser.Math.Vector2;
    getTargetPoint: () => Phaser.Math.Vector2;
    baseWidth: number;
  }) {
    this.colorHex = options.color;
    this.getSourcePoint = options.getSourcePoint;
    this.getTargetPoint = options.getTargetPoint;
    this.baseWidth = options.baseWidth;
    this.progress = 0;
    this.intensity = 1;
    this.graphics.setVisible(true);
    this.graphics.clear();
  }

  public setProgress(p: number) {
    this.progress = Phaser.Math.Clamp(p, 0, 1);
  }

  public setIntensity(i: number) {
    this.intensity = Phaser.Math.Clamp(i, 0, 1);
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        intensity: 0,
        duration: 140,
        onComplete: () => {
          this.graphics.clear();
          this.graphics.setVisible(false);
          resolve();
        }
      });
    });
  }

  public update(time: number, _delta?: number) {
    if (!this.graphics.visible || this.intensity <= 0 || !this.getSourcePoint || !this.getTargetPoint) return;

    this.graphics.clear();

    const startPt = this.getSourcePoint();
    const endPt = this.getTargetPoint();

    // Sinking gravity offset proportional to distance
    const dist = Phaser.Math.Distance.BetweenPoints(startPt, endPt);
    const gravityOffset = Phaser.Math.Clamp(dist * 0.18, 20, 55);

    const midX = (startPt.x + endPt.x) / 2;
    const midY = (startPt.y + endPt.y) / 2;

    const controlPt = new Phaser.Math.Vector2(midX, midY + gravityOffset);

    // Calculate quadratic Bezier curve
    const curve = new Phaser.Curves.QuadraticBezier(startPt, controlPt, endPt);
    const totalPoints = 24;
    const points = curve.getPoints(totalPoints);

    // Slice points array based on stream expansion progress
    const visibleCount = Math.floor(points.length * this.progress);
    if (visibleCount < 2) return;
    const visiblePoints = points.slice(0, visibleCount);

    // Apply pulse multiplier (3-5% variation)
    const pulse = 1 + Math.sin(time * 0.015) * 0.04;
    const colorInt = Phaser.Display.Color.HexStringToColor(this.colorHex).color;

    // Calculate variable thickness multiplier along stream
    const finalWidth = this.baseWidth * this.intensity * pulse;

    // 1. Draw main thick fluid body
    this.graphics.lineStyle(finalWidth, colorInt, 0.88);
    this.graphics.beginPath();
    this.graphics.moveTo(visiblePoints[0].x, visiblePoints[0].y);
    for (let i = 1; i < visiblePoints.length; i++) {
      this.graphics.lineTo(visiblePoints[i].x, visiblePoints[i].y);
    }
    this.graphics.strokePath();

    // 2. Draw glossy white inner highlight line
    const highlightWidth = Phaser.Math.Clamp(finalWidth * 0.35, 1.5, 3);
    this.graphics.lineStyle(highlightWidth, 0xffffff, 0.35 * this.intensity);
    this.graphics.beginPath();
    this.graphics.moveTo(visiblePoints[0].x, visiblePoints[0].y);
    for (let i = 1; i < visiblePoints.length; i++) {
      this.graphics.lineTo(visiblePoints[i].x, visiblePoints[i].y);
    }
    this.graphics.strokePath();
  }

  public destroy() {
    this.graphics.destroy();
  }
}
