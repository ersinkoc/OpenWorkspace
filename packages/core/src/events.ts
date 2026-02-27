/**
 * Typed event bus for decoupled communication.
 * Zero-dependency implementation.
 */

/**
 * Event handler function type.
 */
export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * Event subscription with unsubscribe capability.
 */
export type Subscription = {
  /**
   * Removes the event handler.
   */
  unsubscribe(): void;
};

/**
 * Typed event bus for publish-subscribe patterns.
 * @example
 * const bus = createEventBus();
 * const sub = bus.on('user:login', (user) => console.log(user));
 * bus.emit('user:login', { id: 1, name: 'John' });
 * sub.unsubscribe();
 */
export type EventBus = {
  /**
   * Subscribe to an event type.
   */
  on<T>(event: string, handler: EventHandler<T>): Subscription;

  /**
   * Subscribe to an event type for one emission only.
   */
  once<T>(event: string, handler: EventHandler<T>): Subscription;

  /**
   * Emit an event to all subscribers.
   */
  emit<T>(event: string, payload: T): void;

  /**
   * Remove all handlers for an event, or all events if no event specified.
   */
  off(event?: string): void;

  /**
   * Get count of handlers for an event.
   */
  listenerCount(event: string): number;
};

/**
 * Creates a new event bus instance.
 */
export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>();
  const onceHandlers = new WeakSet<EventHandler>();

  return {
    on<T>(event: string, handler: EventHandler<T>): Subscription {
      const eventHandlers = handlers.get(event) ?? new Set();
      eventHandlers.add(handler as EventHandler);
      handlers.set(event, eventHandlers);

      return {
        unsubscribe(): void {
          eventHandlers.delete(handler as EventHandler);
          if (eventHandlers.size === 0) {
            handlers.delete(event);
          }
        },
      };
    },

    once<T>(event: string, handler: EventHandler<T>): Subscription {
      onceHandlers.add(handler as EventHandler);
      return this.on(event, handler);
    },

    emit<T>(event: string, payload: T): void {
      const eventHandlers = handlers.get(event);
      if (!eventHandlers) return;

      const handlersToRemove: EventHandler[] = [];

      for (const handler of eventHandlers) {
        try {
          const result = handler(payload);
          if (result && typeof (result as Promise<void>).catch === "function") {
            (result as Promise<void>).catch((asyncError) => {
              if (event !== "error") {
                this.emit("error", { event, error: asyncError, payload });
              }
            });
          }
        } catch (error) {
          // Emit errors on a special channel, but don't break other handlers
          if (event !== 'error') {
            this.emit('error', { event, error, payload });
          }
        }

        if (onceHandlers.has(handler)) {
          handlersToRemove.push(handler);
          onceHandlers.delete(handler);
        }
      }

      for (const handler of handlersToRemove) {
        eventHandlers.delete(handler);
      }

      if (eventHandlers.size === 0) {
        handlers.delete(event);
      }
    },

    off(event?: string): void {
      if (event) {
        handlers.delete(event);
      } else {
        handlers.clear();
      }
    },

    listenerCount(event: string): number {
      return handlers.get(event)?.size ?? 0;
    },
  };
}
