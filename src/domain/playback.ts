/** Cancellable, timer-driven playback. No paused polling loop or dangling run. */
export class Playback<T> {
  private frames: T[] = [];
  private index = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private settle: ((finished: boolean) => void) | null = null;
  private delay = 400;
  active = false;
  paused = false;
  constructor(
    private readonly onFrame: (frame: T, index: number, total: number) => void,
  ) {}
  setSpeed(milliseconds: number) {
    this.delay = Math.max(40, milliseconds);
    if (this.active && !this.paused) {
      this.clear();
      this.schedule();
    }
  }
  play(frames: T[]): Promise<boolean> {
    this.stop();
    this.frames = frames;
    this.index = 0;
    this.active = true;
    this.paused = false;
    return new Promise((resolve) => {
      this.settle = resolve;
      if (!frames.length) {
        this.finish(true);
        return;
      }
      this.emit();
      this.schedule();
    });
  }
  pause() {
    if (!this.active) return;
    this.paused = true;
    this.clear();
  }
  resume() {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.schedule();
  }
  step() {
    if (!this.active || !this.paused) return;
    this.advance(false);
  }
  stop() {
    this.finish(false);
  }
  private clear() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
  private emit() {
    this.onFrame(
      this.frames[this.index],
      this.index,
      Math.max(0, this.frames.length - 1),
    );
  }
  private schedule() {
    if (this.active && !this.paused)
      this.timer = setTimeout(() => {
        this.timer = null;
        this.advance(true);
      }, this.delay);
  }
  private advance(automatic: boolean) {
    if (this.index >= this.frames.length - 1) {
      this.finish(true);
      return;
    }
    this.index++;
    this.emit();
    if (this.index === this.frames.length - 1 && !automatic) this.finish(true);
    else if (automatic) this.schedule();
  }
  private finish(finished: boolean) {
    this.clear();
    this.active = false;
    this.paused = false;
    const settle = this.settle;
    this.settle = null;
    settle?.(finished);
  }
}
