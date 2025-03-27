import { PosthogEvent } from "../../events";
import { fetchEventsForReportGenerator } from "../events";
import {
  CohortRetentionReport,
  generateCohortRetentionReport,
} from "./cohortRetentionReport";
import { PeriodName } from "./period";
import { generatePeriodProjectsReport, ProjectsReport } from "./projectsReport";
import {
  generateUserActivityReport,
  UserActivityReport,
} from "./userActivityReport";

type BasePeriodReport = {
  userActivityReport: UserActivityReport;
  projectsReport: ProjectsReport;
};

export type AllTimePeriodReort = BasePeriodReport;

export type PeriodReport = BasePeriodReport & {
  cohortRetentionReport: CohortRetentionReport;
};

/**
 * Generates a report that calculates usage for last numPeriod periods of size periodName.
 * Each period is a central time scope of calculation.
 *
 * @param numPeriods - The number of periods to calculate usage for
 * @param periodName - The size of the period
 * @param prefetchedEvents - Optional prefetched events. If provided, should be prepared (our events removed, sorted) and contain all events available for CLI for the whole history. Obtain with fetchAllCliEvents().
 * @returns Array of Wasp reports
 */
export async function generatePeriodReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<PeriodReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const basePeriodReport = await generatePeriodReportBaseReports(
    events,
    numPeriods,
    periodName,
  );
  const cohortRetentionReport = await generateCohortRetentionReport(
    events,
    numPeriods,
    periodName,
  );

  return {
    ...basePeriodReport,
    cohortRetentionReport,
  };
}

/**
 * Generates a period report excluding cohort retention report due to quadratic complexity.
 */
export async function generateAllTimePeriodReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const baseReports = await generatePeriodReportBaseReports(
    events,
    numPeriods,
    periodName,
  );

  return baseReports;
}

async function generatePeriodReportBaseReports(
  events: PosthogEvent[],
  numPeriods: number,
  periodName: PeriodName,
) {
  const userActivityReport = await generateUserActivityReport(
    events,
    numPeriods,
    periodName,
  );
  const projectsReport = await generatePeriodProjectsReport(
    events,
    numPeriods,
    periodName,
  );

  return {
    userActivityReport,
    projectsReport,
  };
}
