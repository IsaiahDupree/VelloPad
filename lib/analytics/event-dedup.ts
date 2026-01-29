/**
 * Event Deduplication System for Meta Pixel + CAPI
 * Feature: GDP-010
 *
 * Ensures browser Pixel and server CAPI events are properly deduplicated
 * using shared event IDs stored in session storage.
 */

/**
 * Generate unique event ID for deduplication
 * Format: timestamp_random
 */
export function generateEventID(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Client-side: Store event ID in session storage for server-side retrieval
 * @param eventName - Event name (e.g., 'Purchase', 'Lead')
 * @param eventID - Generated event ID
 */
export function storeEventID(eventName: string, eventID: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `meta_event_${eventName}_${Date.now()}`;
    sessionStorage.setItem(key, eventID);

    // Clean up old event IDs (keep only last 10)
    const allKeys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith('meta_event_')
    );
    if (allKeys.length > 10) {
      const oldestKeys = allKeys.slice(0, allKeys.length - 10);
      oldestKeys.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (error) {
    // Silently fail if sessionStorage is unavailable
    console.warn('Failed to store event ID:', error);
  }
}

/**
 * Server-side: Retrieve event ID from request cookie/header
 * If browser sent event first, server should use same ID
 * @param request - Request object
 * @param eventName - Event name to retrieve ID for
 */
export function retrieveEventID(
  request: Request,
  eventName: string
): string | undefined {
  try {
    // Check for event ID in custom header (set by client)
    const headerKey = `x-meta-event-${eventName.toLowerCase()}`;
    const eventID = request.headers.get(headerKey);

    if (eventID) {
      return eventID;
    }

    // Fallback: generate new ID if not found
    return undefined;
  } catch (error) {
    console.warn('Failed to retrieve event ID:', error);
    return undefined;
  }
}

/**
 * Track event with deduplication
 * Returns eventID that should be used for both browser and server tracking
 *
 * Usage:
 * 1. Client calls this to generate/store eventID
 * 2. Client fires browser pixel with eventID
 * 3. Client sends server request with eventID in header
 * 4. Server retrieves eventID and uses for CAPI
 */
export function createDedupEvent(eventName: string): {
  eventID: string;
  storeForServer: () => void;
  getHeaders: () => Record<string, string>;
} {
  const eventID = generateEventID();

  return {
    eventID,
    storeForServer: () => storeEventID(eventName, eventID),
    getHeaders: () => ({
      [`x-meta-event-${eventName.toLowerCase()}`]: eventID,
    }),
  };
}

/**
 * Server-side helper to get event ID from request or generate new
 */
export function getOrGenerateEventID(
  request: Request | undefined,
  eventName: string
): string {
  if (!request) {
    return generateEventID();
  }

  const existingID = retrieveEventID(request, eventName);
  return existingID || generateEventID();
}
