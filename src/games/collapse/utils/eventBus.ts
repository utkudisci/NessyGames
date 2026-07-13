type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  clear(): void {
    this.listeners = {};
  }
}

export const gameEventBus = new EventBus();
export default gameEventBus;
