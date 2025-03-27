import ImageCharts from "image-charts";
import moment from "../moment";
import {
  AllTimePeriodReort,
  generateAllTimePeriodReport,
  generatePeriodReport,
  PeriodReport,
} from "./periodReport";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export type SimpleReport = {
  text: string[];
  csv: (number | string)[][];
  chart: ImageCharts;
};

export type CompositeReport = { [reportName: string]: Partial<SimpleReport> };

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
): Promise<AllTimePeriodReort> {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return generateAllTimePeriodReport(numMonths, "month", prefetchedEvents);
}
