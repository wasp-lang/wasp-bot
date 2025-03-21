import { WaspReport } from "..";
import { fetchEventsForReportGenerator } from "../events";
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
