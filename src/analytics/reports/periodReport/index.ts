import { PosthogEvent } from "../../events";
import { fetchEventsForReportGenerator } from "../events";
import {
  CohortRetentionReport,
  ProjectsReport,
  UserActivityReport,
} from "../reports";
import { generateCohortRetentionReport } from "./cohortRetentionReport";
import { PeriodName } from "./period";
import { generatePeriodProjectsReport } from "./projectsReport";
import { generateUserActivityReport } from "./userActivityReport";

type BasePeriodReport = {
  userActivityReport: UserActivityReport;
  projectsReport: ProjectsReport;
};

export type AllTimePeriodReort = BasePeriodReport;

export type PeriodReport = BasePeriodReport & {
  cohortRetentionReport: CohortRetentionReport;
};

/**
 * Generates a period report that spans last numPeriod periods of size periodName.
 */
export async function generatePeriodReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<PeriodReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

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
  const cohortRetentionReport = await generateCohortRetentionReport(
    events,
    numPeriods,
    periodName,
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
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

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
