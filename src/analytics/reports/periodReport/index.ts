import { PeriodName, PosthogEvent, WaspReport } from "../../types";
import { fetchEventsForReportGenerator } from "../events";

import { generateCohortRetentionReport } from "./cohortRetentionReport";
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
export async function generatePeriodReport(
  numPeriods: number,
  periodName: PeriodName,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  genCohortRetentionReport = true,
): Promise<WaspReport[]> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  return [
    ...(await generateUserActivityReport(numPeriods, periodName, events)),
    ...(genCohortRetentionReport
      ? await generateCohortRetentionReport(numPeriods, periodName, events)
      : []),
    ...(await generatePeriodProjectsReport(numPeriods, periodName, events)),
  ];
}
