import { PosthogEvent } from "../events";
import {
  EventsByExecutionEnvironment,
  ExecutionEnvironment,
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} from "../executionEnvs";
import { fetchEventsForReportGenerator } from "./events";
import { TotalReport } from "./reports";
import { groupEventsByProject } from "./utils";

/**
 * Generates report for some general statistics that cover the whole (total) time (all of the events).
 */
export async function generateTotalReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
): Promise<TotalReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const { localEvents, groupedNonLocalEvents } =
    groupEventsByExecutionEnv(events);

  const localEventsByProject = groupEventsByProject(localEvents);
  const numProjectsTotal = Object.keys(localEventsByProject).length;
  const numProjectsBuiltTotal = Object.values(localEventsByProject).filter(
    (events) => events.some((e) => e.properties?.is_build),
  ).length;
  const numUniqueUsersTotal = new Set(localEvents.map((e) => e.distinct_id))
    .size;

  const totalUniqueEventsByExecutionEnv = calcTotalUniqueEventsByExecutionEnv(
    groupedNonLocalEvents,
  );
  const prettyNonLocalMetrics = showPrettyMetrics(
    totalUniqueEventsByExecutionEnv,
  );

  const report = {
    totalUniqueReport: {
      text: [
        `Number of unique projects in total: ${numProjectsTotal}`,
        `Number of unique projects built in total: ${numProjectsBuiltTotal}`,
        `Number of unique users in total: ${numUniqueUsersTotal}`,
        ` - ${prettyNonLocalMetrics}`,
      ],
    },
  };

  return report;
}

function calcTotalUniqueEventsByExecutionEnv(
  eventsByEnv: EventsByExecutionEnvironment,
): Record<ExecutionEnvironment, number> {
  const totalUniqueEventsByExecutionEnv: Record<string, number> = {};
  for (const envKey of Object.keys(executionEnvs) as ExecutionEnvironment[]) {
    const events = eventsByEnv[envKey] ?? [];
    totalUniqueEventsByExecutionEnv[envKey] = new Set(
      events.map((event) => event.distinct_id),
    ).size;
  }
  return totalUniqueEventsByExecutionEnv as Record<
    ExecutionEnvironment,
    number
  >;
}
