import _ from "lodash";

import { getEventContextValues } from "./eventContext";
import { PosthogEvent } from "./events";

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

export type ExecutionEnvironment = keyof typeof executionEnvs;

export interface PosthogEventWithExecutionEnv extends PosthogEvent {
  _executionEnv: ExecutionEnvironment | null;
}

export type EventsByExeuctionEnvironment = Record<
  ExecutionEnvironment,
  PosthogEventWithExecutionEnv[]
>;

/**
 * Organizes events by the execution environment:
 * - non-local: e.g. Replit, Gitpod, Github Codespaces, CI, etc.
 * - local: User running Wasp on their computer
 */
export function groupEventsByExecutionEnv(events: PosthogEvent[]): {
  localEvents: PosthogEventWithExecutionEnv[];
  groupedNonLocalEvents: EventsByExeuctionEnvironment;
} {
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
    groupedNonLocalEvents:
      groupedNonLocalEvents as EventsByExeuctionEnvironment,
  };
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
 * @returns Formatted string representation of metrics in the format "[EnvName: MetricValue] [EnvName2: MetricValue2] ..."
 */
export function showPrettyMetrics(
  metricsByEnv: Record<ExecutionEnvironment, number>,
): string {
  const output = [];
  for (const [key, metric] of Object.entries(metricsByEnv)) {
    const context = executionEnvs[key as ExecutionEnvironment];
    output.push(`[${context.name}: ${metric}]`);
  }
  return output.join(" ");
}
