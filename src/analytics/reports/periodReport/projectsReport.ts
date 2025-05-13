import { PosthogEvent } from "../../events";
import { groupEventsByExecutionEnv } from "../../executionEnvs";
import moment from "../../moment";
import { createCrossTable } from "../../table";
import { fetchEventsForReportGenerator } from "../events";
import { ProjectsReport } from "../reports";
import { groupEventsByProject } from "../utils";
import { calcLastNPeriods, PeriodName } from "./period";

export async function generatePeriodProjectsReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<ProjectsReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const { localEvents } = groupEventsByExecutionEnv(events);

  const periods = calcLastNPeriods(numPeriods, periodName);

  const localEventsByProject = groupEventsByProject(localEvents);

  const calcProjectCreationTime = (allProjectEvents: PosthogEvent[]) => {
    return moment.min(allProjectEvents.map((e) => moment(e.timestamp)));
  };

  const projectCreationTimes = Object.values(localEventsByProject).map(
    (events) => calcProjectCreationTime(events),
  );
  // [num_projects_created_before_end_of_period_0, num_projects_created_before_end_of_period_1, ...]
  const numProjectsCreatedTillPeriod = periods.map(
    ([, pEnd]) =>
      projectCreationTimes.filter((t) => t.isSameOrBefore(pEnd)).length,
  );

  const calcProjectFirstBuildTime = (allProjectEvents: PosthogEvent[]) => {
    const buildEvents = allProjectEvents.filter((e) => e.properties?.is_build);
    return buildEvents.length == 0
      ? undefined
      : moment.min(buildEvents.map((e) => moment(e.timestamp)));
  };

  const projectFirstBuildTimes = Object.values(localEventsByProject)
    .map((events) => calcProjectFirstBuildTime(events))
    .filter((buildTime) => buildTime);
  // [num_projects_built_before_end_of_period_0, num_projects_built_before_end_of_period_1, ...]
  const numProjectsBuiltTillPeriod = periods.map(
    ([, pEnd]) =>
      projectFirstBuildTimes.filter((t) => t?.isSameOrBefore(pEnd)).length,
  );

  // Organize metrics into a "CSV"-like list of lists, where each element is
  // [periodEnd, createdDiff, createdCumm, builtDiff, builtCumm] .
  const csv = periods.map(([, periodEnd], i) => {
    const createdCumm = numProjectsCreatedTillPeriod[i];
    const createdDiff =
      i > 0
        ? numProjectsCreatedTillPeriod[i] - numProjectsCreatedTillPeriod[i - 1]
        : null;
    const builtCumm = numProjectsBuiltTillPeriod[i];
    const builtDiff =
      i > 0
        ? numProjectsBuiltTillPeriod[i] - numProjectsBuiltTillPeriod[i - 1]
        : null;
    return [
      periodEnd.format("YY-MM-DD"),
      createdDiff,
      createdCumm,
      builtDiff,
      builtCumm,
    ] as const;
  });

  const table = createCrossTable({
    head: ["", "created", "built"],
    rows: csv.map(
      ([periodEnd, createdDiff, createdCumm, builtDiff, builtCumm]) => ({
        [periodEnd]: [
          (createdDiff !== null ? `(+${createdDiff}) ` : "") +
            createdCumm.toString(),
          (builtDiff !== null ? `(+${builtDiff}) ` : "") + builtCumm.toString(),
        ],
      }),
    ),
  });

  return {
    csv,
    text: [
      `==== Projects created/built per ${periodName} (cumm) ====`,
      "```",
      table.toString(),
      "```",
    ],
  };
}
