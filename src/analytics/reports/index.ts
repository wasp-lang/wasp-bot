import ImageCharts from "image-charts";
import { PosthogEvent } from "../events";
import moment from "../moment";
import {
  generateFullPeriodReport,
  generatePeriodReportWithoutCohortRetention,
} from "./periodReport";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export type WaspReport = Record<
  string,
  {
    text?: string[];
    csv?: (number | string)[][];
    chart?: ImageCharts;
  }
>;

export async function generateDailyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 14,
) {
  return await generateFullPeriodReport(prefetchedEvents, numPeriods, "day");
}

export async function generateWeeklyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
) {
  return await generateFullPeriodReport(prefetchedEvents, numPeriods, "week");
}

export async function generateMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number = 12,
) {
  return await generateFullPeriodReport(prefetchedEvents, numPeriods, "month");
}

export async function generateAllTimeMonthlyReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
) {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return await generatePeriodReportWithoutCohortRetention(
    prefetchedEvents,
    numMonths,
    "month",
  );
}
