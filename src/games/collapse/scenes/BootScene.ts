import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show a loading text or base assets
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
