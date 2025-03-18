import { type PosthogEvent } from "./events";

/**
 * @param event
 * @returns Context values, all lowercase strings.
 */
export function getEventContextValues(event: PosthogEvent): string[] {
  return (
    event.properties.context
      ?.split(" ")
      .filter((str) => str !== "")
      .map((v) => v.toLowerCase()) ?? []
  );
}

export function setEventContextValues(
  event: PosthogEvent,
  values: string[],
): PosthogEvent {
  return {
    ...event,
    properties: {
      ...event.properties,
      context: values.join(" "),
    },
  };
}

export function addEventContextValue(
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
