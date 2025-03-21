import _ from "lodash";

import { getEventContextValues } from "./eventContext";
import { PosthogEvent } from "./events";

export type ExecutionEnvironment = keyof typeof executionEnvs;

export type PosthogEventWithExecutionEnv = PosthogEvent & {
  _executionEnv: ExecutionEnvironment | null;
};

export type EventsByExeuctionEnvironment = Record<
  ExecutionEnvironment,
  PosthogEventWithExecutionEnv[]
>;

export type EventsByExecutionEnv = {
  localEvents: PosthogEventWithExecutionEnv[];
  groupedNonLocalEvents: EventsByExeuctionEnvironment;
};

/**
 * Defines all non-local execution environments from which Wasp CLI sends
 * telemetry data to PostHog.
 * - "contextKey" is used to identify the execution env in the event context
 * - "name" is used to display the env in the output
 */
export const executionEnvs = {
  replit: { contextKey: "replit", name: "Replit" },
  gitpod: { contextKey: "gitpod", name: "Gitpod" },
  codespaces: {
    contextKey: "codespaces",
    name: "GH Codespaces",
  },
  ci: { contextKey: "ci", name: "CI" },
} as const;

/**
 * Organizes events by the execution environment:
 * - non-local: e.g. Replit, Gitpod, Github Codespaces, CI, etc.
 * - local: User running Wasp on their computer
 *
 * @returns Object containing local events and grouped non-local events
 */
export function groupEventsByExecutionEnv(
  events: PosthogEvent[],
): EventsByExecutionEnv {
  const eventsWithExecutionEnv = events.map((event) => {
    const executionEnv = getExecutionEnvFromEventContext(event);
    return {
      ...event,
      _executionEnv: executionEnv,
    } satisfies PosthogEventWithExecutionEnv;
  });
  const [localEvents, nonLocalEvents] = _.partition(
    eventsWithExecutionEnv,
    (event) => {
      return event._executionEnv === null;
    },
  );
  const groupedNonLocalEvents = _.groupBy(nonLocalEvents, (event) => {
    return event._executionEnv;
  });
  return {
    localEvents,
    groupedNonLocalEvents,
  } as EventsByExecutionEnv;
}

function getExecutionEnvFromEventContext(
  event: PosthogEvent,
): ExecutionEnvironment | null {
  const contextValues = getEventContextValues(event);
  for (const [key, actor] of Object.entries(executionEnvs)) {
    if (contextValues.includes(actor.contextKey)) {
      return key as ExecutionEnvironment;
    }
  }
  return null;
}

/**
 * Formats metrics by execution environment into a pretty string representation.
 *
 * @param metricsByEnv - Object containing metric values keyed by environment identifiers
 * @returns Formatted string representation of metrics in the format "[EnvName: MetricValue] [EnvName2: MetricValue2] ..."
 */
export function showPrettyMetrics(
  metricsByEnv: Record<ExecutionEnvironment, number>,
): string {
  const output = [];
  for (const [key, metric] of Object.entries(metricsByEnv)) {
    const context = executionEnvs[key];
    output.push(`[${context.name}: ${metric}]`);
  }
  return output.join(" ");
}
