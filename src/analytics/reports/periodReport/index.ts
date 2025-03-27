import { fetchEventsForReportGenerator } from "../events";
import {
  CohortRetentionReport,
  generateCohortRetentionReport,
} from "./cohortRetentionReport";
import { generatePeriodProjectsReport, ProjectsReport } from "./projectsReport";
import {
  generateUserActivityReport,
  UserActivityReport,
} from "./userActivityReport";

// Generates a report that calculates usage for last numPeriod periods of size periodName,
// where periodName should be 'day' or 'week' or 'month'.
// Each period is a central time scope of calculation.
//
// You can optionally pass prefetched events, in which case you should make sure
// they are prepared (our events removed, sorted) and that they are all events available for CLI,
// for the whole history. You should obtain them with fetchAllCliEvents(), in that case they will
// be all good.

type BasePeriodReport = {
  userActivityReport: UserActivityReport;
  projectsReport: ProjectsReport;
};

export type AllTimePeriodReort = BasePeriodReport;

export type PeriodReport = BasePeriodReport & {
  cohortRetentionReport: CohortRetentionReport;
};

export async function generatePeriodReport(
  numPeriods,
  periodName,
  prefetchedEvents = undefined,
): Promise<PeriodReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const basePeriodReeport = await generatePeriodReportBaseReports(
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
    ...basePeriodReeport,
    cohortRetentionReport,
  };
}

/**
 * Generates a period report excluding cohort retention due to quadratic complexity.
 */
export async function generateAllTimePeriodReport(
  numPeriods,
  periodName,
  prefetchedEvents = undefined,
): Promise<AllTimePeriodReort> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  return await generatePeriodReportBaseReports(numPeriods, periodName, events);
}

async function generatePeriodReportBaseReports(
  numPeriods,
  periodName,
  events,
): Promise<BasePeriodReport> {
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
