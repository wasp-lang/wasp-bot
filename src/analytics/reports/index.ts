import moment from "../moment";
import { PosthogEvent } from "../types";
import { generatePeriodReport } from "./periodReport";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export async function generateDailyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
) {
  return await generatePeriodReport(
    numPeriods ?? 14,
    "day",
    prefetchedEvents,
    false,
  );
}

export async function generateWeeklyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
) {
  return await generatePeriodReport(numPeriods ?? 12, "week", prefetchedEvents);
}

export async function generateMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
  genCohortRetentionReport = true,
) {
  return await generatePeriodReport(
    numPeriods ?? 12,
    "month",
    prefetchedEvents,
    genCohortRetentionReport,
  );
}

export async function generateAllTimeMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
) {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return await generateMonthlyReport(prefetchedEvents, numMonths, false);
}
