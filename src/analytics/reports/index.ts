import ImageCharts from "image-charts";
import { PosthogEvent } from "../events";
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

export async function generateDailyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 14,
): Promise<PeriodReport> {
  return await generatePeriodReport(prefetchedEvents, numPeriods, "day");
}

export async function generateWeeklyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
): Promise<PeriodReport> {
  return await generatePeriodReport(prefetchedEvents, numPeriods, "week");
}

export async function generateMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
): Promise<PeriodReport> {
  return await generatePeriodReport(prefetchedEvents, numPeriods, "month");
}

export async function generateAllTimeMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
): Promise<AllTimePeriodReort> {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return await generateAllTimePeriodReport(
    prefetchedEvents,
    numMonths,
    "month",
  );
}
