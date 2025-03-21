import { type PosthogEvent } from "./events";

/**
 * Extracts and normalizes context values from a PosthogEvent object.
 * @param event - The PosthogEvent object to extract context values from
 * @returns An array of context values as lowercase strings, or an empty array if no context exists
 */
export function getEventContextValues(event: PosthogEvent): string[] {
  return (
    event.properties?.context
      ?.split(" ")
      .filter((str) => str !== "")
      .map((v) => v.toLowerCase()) ?? []
  );
}

/**
 * Sets the context values for an event.
 * @param event The event to modify
 * @param values Array of context values to set
 * @returns A new event with the updated context values
 */
export function setEventContextValues(
  event: PosthogEvent,
  values: string[],
): PosthogEvent {
  return {
    ...event,
    properties: {
      ...(event.properties || {}),
      context: values.join(" "),
    },
  };
}

/**
 * Adds a context value to the event if it doesn't already exist.
 * @param event The PosthogEvent to modify
 * @param value The context value to add
 * @returns A new PosthogEvent with the updated context
 */
export function addEventContextValueIfMissing(
  event: PosthogEvent,
  value: string,
): PosthogEvent {
  const values = getEventContextValues(event);
  if (values.includes(value.toLowerCase())) {
    return event;
  } else {
    return setEventContextValues(event, [...values, value]);
  }
}
