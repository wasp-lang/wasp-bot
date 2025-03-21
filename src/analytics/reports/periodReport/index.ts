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
 * @param {number} numPeriods - The number of periods to calculate usage for
 * @param {PeriodName} periodName - The size of the period
 * @param {PosthogEvent[] | undefined} prefetchedEvents - Optional prefetched events. If provided, should be prepared (our events removed, sorted) and contain all events available for CLI for the whole history. Obtain with fetchAllCliEvents().
 * @param {boolean} genCohortRetentionReport - Whether to generate cohort retention report. Defaults to true.
 * @returns {Promise<WaspReport[]>} Array of Wasp reports
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
