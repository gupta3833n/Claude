import { screen, desktopCapturer } from 'electron';

interface CaptureOptions {
  displayId?: number;
  quality: 'auto' | 'high' | 'medium' | 'low';
  fps: number;
}

export class ScreenCapture {
  private isCapturing: boolean = false;
  private captureInterval: NodeJS.Timeout | null = null;
  private currentDisplayId: number;
  private options: CaptureOptions;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor() {
    this.currentDisplayId = screen.getPrimaryDisplay().id;
    this.options = {
      quality: 'auto',
      fps: 30,
    };
  }

  setOptions(options: Partial<CaptureOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.displayId !== undefined) {
      this.currentDisplayId = options.displayId;
    }
  }

  async start(onFrame: (frame: any) => void): Promise<void> {
    if (this.isCapturing) return;
    this.isCapturing = true;

    const frameInterval = 1000 / this.options.fps;

    const captureFrame = async () => {
      if (!this.isCapturing) return;

      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: this.getThumbnailSize(),
        });

        const source = sources.find(s => s.display_id === String(this.currentDisplayId)) || sources[0];

        if (source) {
          const thumbnail = source.thumbnail;
          const frameData = {
            width: thumbnail.getSize().width,
            height: thumbnail.getSize().height,
            data: thumbnail.toJPEG(this.getJpegQuality()),
            timestamp: Date.now(),
          };

          onFrame(frameData);
          this.frameCount++;
        }
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    };

    // Start capture loop
    this.captureInterval = setInterval(captureFrame, frameInterval);
    await captureFrame(); // Capture first frame immediately
  }

  stop(): void {
    this.isCapturing = false;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  switchDisplay(displayId: number): void {
    this.currentDisplayId = displayId;
  }

  getDisplays(): Array<{ id: number; bounds: Electron.Rectangle; isPrimary: boolean }> {
    return screen.getAllDisplays().map(display => ({
      id: display.id,
      bounds: display.bounds,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    }));
  }

  private getThumbnailSize(): { width: number; height: number } {
    const display = screen.getAllDisplays().find(d => d.id === this.currentDisplayId) || screen.getPrimaryDisplay();
    const scaleFactor = display.scaleFactor || 1;

    switch (this.options.quality) {
      case 'high':
        return {
          width: Math.round(display.bounds.width * scaleFactor),
          height: Math.round(display.bounds.height * scaleFactor),
        };
      case 'medium':
        return {
          width: Math.round(display.bounds.width * 0.75),
          height: Math.round(display.bounds.height * 0.75),
        };
      case 'low':
        return {
          width: Math.round(display.bounds.width * 0.5),
          height: Math.round(display.bounds.height * 0.5),
        };
      case 'auto':
      default:
        // Auto adjusts based on network conditions (to be implemented with adaptive bitrate)
        return {
          width: display.bounds.width,
          height: display.bounds.height,
        };
    }
  }

  private getJpegQuality(): number {
    switch (this.options.quality) {
      case 'high': return 90;
      case 'medium': return 70;
      case 'low': return 50;
      case 'auto':
      default: return 75;
    }
  }

  getStats(): { fps: number; frameCount: number } {
    const now = Date.now();
    const elapsed = (now - this.lastFrameTime) / 1000;
    const fps = elapsed > 0 ? this.frameCount / elapsed : 0;

    return {
      fps: Math.round(fps * 10) / 10,
      frameCount: this.frameCount,
    };
  }

  resetStats(): void {
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
  }
}
