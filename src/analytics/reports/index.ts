import ImageCharts from "image-charts";
import moment from "../moment";
import {
  generateFullPeriodReport,
  generatePeriodReportWithoutCohortRetention,
} from "./periodReport";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

type ReportName = string;

export type SimpleReport = {
  text: string[];
  csv: (number | string)[][];
  chart: ImageCharts;
};

export type CompositeReport = Record<ReportName, Partial<SimpleReport>>;

export async function generateDailyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return await generateFullPeriodReport(
    numPeriods ?? 14,
    "day",
    prefetchedEvents,
  );
}

export async function generateWeeklyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return await generateFullPeriodReport(
    numPeriods ?? 12,
    "week",
    prefetchedEvents,
  );
}

export async function generateMonthlyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
) {
  return await generateFullPeriodReport(
    numPeriods ?? 12,
    "month",
    prefetchedEvents,
  );
}

export async function generateAllTimeMonthlyReport(
  prefetchedEvents = undefined,
) {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return await generatePeriodReportWithoutCohortRetention(
    numMonths,
    "month",
    prefetchedEvents,
  );
}
