import moment from "../moment";
import {
  generateAllTimePeriodReport,
  generatePeriodReport,
} from "./periodReport";
import { AllTimePeriodReport, PeriodReport } from "./reports";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export function generateDailyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
): Promise<PeriodReport> {
  return generatePeriodReport(numPeriods ?? 14, "day", prefetchedEvents);
}

export function generateWeeklyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
): Promise<PeriodReport> {
  return generatePeriodReport(numPeriods ?? 12, "week", prefetchedEvents);
}

export function generateMonthlyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
): Promise<PeriodReport> {
  return generatePeriodReport(numPeriods ?? 12, "month", prefetchedEvents);
}

export function generateAllTimeMonthlyReport(
  prefetchedEvents = undefined,
): Promise<AllTimePeriodReport> {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return generateAllTimePeriodReport(numMonths, "month", prefetchedEvents);
}
