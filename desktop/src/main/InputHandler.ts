import { screen } from 'electron';

interface MouseEvent {
  type: 'mouse';
  action: 'move' | 'click' | 'doubleclick' | 'rightclick' | 'scroll';
  x: number; // Percentage of screen width (0-1)
  y: number; // Percentage of screen height (0-1)
  scrollDelta?: number;
  button?: 'left' | 'right' | 'middle';
}

interface KeyboardEvent {
  type: 'keyboard';
  action: 'keydown' | 'keyup' | 'keypress';
  key: string;
  code: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

type InputEvent = MouseEvent | KeyboardEvent;

export class InputHandler {
  private enabled: boolean = true;
  private currentDisplayId: number;

  constructor() {
    this.currentDisplayId = screen.getPrimaryDisplay().id;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setDisplay(displayId: number): void {
    this.currentDisplayId = displayId;
  }

  handleInput(event: InputEvent): void {
    if (!this.enabled) return;

    try {
      if (event.type === 'mouse') {
        this.handleMouseEvent(event);
      } else if (event.type === 'keyboard') {
        this.handleKeyboardEvent(event);
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }

  private handleMouseEvent(event: MouseEvent): void {
    const display = screen.getAllDisplays().find(d => d.id === this.currentDisplayId) || screen.getPrimaryDisplay();
    const bounds = display.bounds;

    // Convert percentage coordinates to absolute screen coordinates
    const absoluteX = Math.round(bounds.x + (event.x * bounds.width));
    const absoluteY = Math.round(bounds.y + (event.y * bounds.height));

    // Note: In a real implementation, we would use native modules like robotjs or nut.js
    // For now, we'll emit events that could be handled by native code
    console.log(`Mouse ${event.action} at (${absoluteX}, ${absoluteY})`);

    // In production, use something like:
    // robot.moveMouse(absoluteX, absoluteY);
    // if (event.action === 'click') robot.mouseClick();
    // if (event.action === 'rightclick') robot.mouseClick('right');
    // if (event.action === 'scroll') robot.scrollMouse(0, event.scrollDelta || 0);
  }

  private handleKeyboardEvent(event: KeyboardEvent): void {
    // Note: In a real implementation, we would use native modules like robotjs or nut.js
    console.log(`Key ${event.action}: ${event.key} (${event.code})`);

    // In production, use something like:
    // const modifiers = [];
    // if (event.modifiers.ctrl) modifiers.push('control');
    // if (event.modifiers.alt) modifiers.push('alt');
    // if (event.modifiers.shift) modifiers.push('shift');
    // if (event.modifiers.meta) modifiers.push('command');
    //
    // if (event.action === 'keydown') {
    //   robot.keyToggle(event.key.toLowerCase(), 'down', modifiers);
    // } else if (event.action === 'keyup') {
    //   robot.keyToggle(event.key.toLowerCase(), 'up', modifiers);
    // }
  }

  // Get the current mouse position as percentage
  getMousePosition(): { x: number; y: number } {
    const cursorPos = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPos);
    const bounds = display.bounds;

    return {
      x: (cursorPos.x - bounds.x) / bounds.width,
      y: (cursorPos.y - bounds.y) / bounds.height,
    };
  }
}
