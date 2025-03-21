import { PosthogEvent } from "../../events";
import { fetchEventsForReportGenerator } from "../events";
import { generateCohortRetentionReport } from "./cohortRetentionReport";
import { PeriodName } from "./period";
import { generatePeriodProjectsReport } from "./projectsReport";
import { generateUserActivityReport } from "./userActivityReport";

/**
 * Generates a report that calculates usage for last numPeriod periods of size periodName.
 * Each period is a central time scope of calculation.
 *
 * @param numPeriods - The number of periods to calculate usage for
 * @param periodName - The size of the period
 * @param prefetchedEvents - Optional prefetched events. If provided, should be prepared (our events removed, sorted) and contain all events available for CLI for the whole history. Obtain with fetchAllCliEvents().
 * @returns Array of Wasp reports
 */
export async function generateFullPeriodReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const baseReports = await generatePeriodReportDefaultReports(
    events,
    numPeriods,
    periodName,
  );

  return {
    ...baseReports,
    cohortRetentionReport: await generateCohortRetentionReport(
      events,
      numPeriods,
      periodName,
    ),
  };
}

export async function generatePeriodReportWithoutCohortRetention(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const baseReports = await generatePeriodReportDefaultReports(
    events,
    numPeriods,
    periodName,
  );

  return baseReports;
}

async function generatePeriodReportDefaultReports(
  events: PosthogEvent[],
  numPeriods: number,
  periodName: PeriodName,
) {
  return {
    userActivityReport: await generateUserActivityReport(
      events,
      numPeriods,
      periodName,
    ),
    projectsReport: await generatePeriodProjectsReport(
      events,
      numPeriods,
      periodName,
    ),
  };
}
