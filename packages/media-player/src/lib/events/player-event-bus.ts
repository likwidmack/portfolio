import type { PlayerEventHandler, PlayerEventMap, PlayerEventName } from '../types.js';

/**
 * Minimal typed pub/sub used by {@link TgmcPlayer}.
 * Listeners receive payloads from {@link PlayerEventMap}.
 */
export class PlayerEventBus {
  private readonly handlers = new Map<PlayerEventName, Set<PlayerEventHandler<PlayerEventName>>>();

  /**
   * Register a listener.
   * @returns Disposer that removes only this handler
   */
  on<K extends PlayerEventName>(event: K, handler: PlayerEventHandler<K>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as PlayerEventHandler<PlayerEventName>);
    this.handlers.set(event, set);
    return () => set.delete(handler as PlayerEventHandler<PlayerEventName>);
  }

  /** Notify all listeners for `event` with a typed payload. */
  emit<K extends PlayerEventName>(event: K, payload: PlayerEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) {
      return;
    }
    for (const handler of set) {
      handler(payload as PlayerEventMap[PlayerEventName]);
    }
  }

  /** Remove all listeners (called from {@link TgmcPlayer.destroy}). */
  clear(): void {
    this.handlers.clear();
  }
}
