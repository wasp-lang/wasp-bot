import ImageCharts from "image-charts";
import moment from "../moment";
import { generatePeriodReport } from "./periodReport";
export { fetchEventsForReportGenerator } from "./events";
export { generateTotalReport } from "./totalReport";

export type WaspReport = {
  text: string[];
  chart?: ImageCharts;
  csv?: (string | number)[][];
};

export async function generateDailyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
): Promise<WaspReport[]> {
  return generatePeriodReport(numPeriods ?? 14, "day", prefetchedEvents, false);
}

export async function generateWeeklyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
): Promise<WaspReport[]> {
  return generatePeriodReport(numPeriods ?? 12, "week", prefetchedEvents);
}

export async function generateMonthlyReport(
  prefetchedEvents = undefined,
  numPeriods = undefined,
  genCohortRetentionReport = true,
): Promise<WaspReport[]> {
  return generatePeriodReport(
    numPeriods ?? 12,
    "month",
    prefetchedEvents,
    genCohortRetentionReport,
  );
}

export async function generateAllTimeMonthlyReport(
  prefetchedEvents = undefined,
): Promise<WaspReport[]> {
  const numMonths = moment().diff(moment("2021-01-01"), "months") + 1;
  return generateMonthlyReport(prefetchedEvents, numMonths, false);
}
