import { fetchEventsForReportGenerator } from "../events";
import { AllTimePeriodReport, PeriodReport } from "../reports";
import { generateCohortRetentionReport } from "./cohortRetentionReport";
import { generatePeriodProjectsReport } from "./projectsReport";
import { generateUserActivityReport } from "./userActivityReport";

// Generates a report that calculates usage for last numPeriod periods of size periodName,
// where periodName should be 'day' or 'week' or 'month'.
// Each period is a central time scope of calculation.
//
// You can optionally pass prefetched events, in which case you should make sure
// they are prepared (our events removed, sorted) and that they are all events available for CLI,
// for the whole history. You should obtain them with fetchAllCliEvents(), in that case they will
// be all good.

export async function generatePeriodReport(
  numPeriods,
  periodName,
  prefetchedEvents = undefined,
): Promise<PeriodReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const userActivityReport = await generateUserActivityReport(
    numPeriods,
    periodName,
    events,
  );
  const projectsReport = await generatePeriodProjectsReport(
    numPeriods,
    periodName,
    events,
  );
  const cohortRetentionReport = await generateCohortRetentionReport(
    numPeriods,
    periodName,
    events,
  );

  return {
    userActivityReport,
    projectsReport,
    cohortRetentionReport,
  };
}

/**
 * Generates a report that spans Wasp's whole existance.
 * The report excludes the cohort retention report due to quadratic complexity.
 */
export async function generateAllTimePeriodReport(
  numPeriods,
  periodName,
  prefetchedEvents = undefined,
): Promise<AllTimePeriodReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const userActivityReport = await generateUserActivityReport(
    numPeriods,
    periodName,
    events,
  );
  const projectsReport = await generatePeriodProjectsReport(
    numPeriods,
    periodName,
    events,
  );

  return {
    userActivityReport,
    projectsReport,
  };
}
