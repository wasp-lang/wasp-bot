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
  numPeriods: number,
  periodName: PeriodName,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const baseReports = await generatePeriodReportDefaultReports(
    numPeriods,
    periodName,
    events,
  );

  return {
    ...baseReports,
    cohortRetentionReport: await generateCohortRetentionReport(
      numPeriods,
      periodName,
      events,
    ),
  };
}

export async function generatePeriodReportWithoutCohortRetention(
  numPeriods,
  periodName,
  prefetchedEvents = undefined,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const baseReports = await generatePeriodReportDefaultReports(
    numPeriods,
    periodName,
    events,
  );

  return baseReports;
}

async function generatePeriodReportDefaultReports(
  numPeriods,
  periodName,
  events = undefined,
) {
  return {
    userActivityReport: await generateUserActivityReport(
      numPeriods,
      periodName,
      events,
    ),
    projectsReport: await generatePeriodProjectsReport(
      numPeriods,
      periodName,
      events,
    ),
  };
}
