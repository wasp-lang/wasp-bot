import { PosthogEvent } from "../events";
import moment from "../../moment";
import {
  generateAllTimePeriodReport,
  generatePeriodReport,
} from "./periodReport";
import { AllTimePeriodReport, PeriodReport } from "./reports";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export function generateDailyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 14,
): Promise<PeriodReport> {
  return generatePeriodReport(prefetchedEvents, numPeriods, "day");
}

export function generateWeeklyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
): Promise<PeriodReport> {
  return generatePeriodReport(prefetchedEvents, numPeriods, "week");
}

export function generateMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
): Promise<PeriodReport> {
  return generatePeriodReport(prefetchedEvents, numPeriods, "month");
}

export function generateAllTimeMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
): Promise<AllTimePeriodReport> {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return generateAllTimePeriodReport(prefetchedEvents, numMonths, "month");
}
