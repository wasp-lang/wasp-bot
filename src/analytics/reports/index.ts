export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";
import { generatePeriodReport } from "./periodReport";

export async function generateDailyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return generatePeriodReport(numPeriods ?? 14, "day", prefetchedEvents, false);
}

export async function generateWeeklyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return generatePeriodReport(numPeriods ?? 12, "week", prefetchedEvents);
}

export async function generateMonthlyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return generatePeriodReport(numPeriods ?? 12, "month", prefetchedEvents);
}
