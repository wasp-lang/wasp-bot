import { type PosthogEvent } from "./events";

/**
 * Extracts and normalizes context values from a PosthogEvent object.
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
 * @returns A new PosthogEvent with the updated context, or the original event if the value already exists
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
