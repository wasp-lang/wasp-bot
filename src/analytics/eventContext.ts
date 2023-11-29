import { type PosthogEvent } from "./events";

export function getEventContextValues(event: PosthogEvent): string[] {
  return event.properties.context?.split(" ").map((v) => v.toLowerCase()) ?? [];
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
