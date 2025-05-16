import fs from "fs";
import os from "os";
import logger from "../utils/logger";
import { getAnalyticsErrorMessage } from "./errors";
import * as reports from "./reports";
import {
  AllTimePeriodReport,
  ChartReport,
  ImageChartsReport,
  TextReport,
} from "./reports/reports";

async function cliReport(): Promise<void> {
  const events = await reports.fetchEventsForReportGenerator();

  printReportTitle("TOTAL REPORT");
  printReportInCLI(await reports.generateTotalReport(events));

  printReportTitle("DAILY REPORT");
  printReportInCLI(await reports.generateDailyReport(events));

  printReportTitle("WEEKLY REPORT");
  printReportInCLI(await reports.generateWeeklyReport(events));

  printReportTitle("MONTHLY REPORT");
  printReportInCLI(await reports.generateMonthlyReport(events));

  printReportTitle("ALL TIME MONTHLY REPORT (CSVs)");
  printAllTimeMonthlyReportCsvInCLI(
    await reports.generateAllTimeMonthlyReport(events),
  );
}

function printReportTitle(text: string): void {
  console.log(`\x1b[33m \n\n${text} \x1b[0m`);
}

function printReportInCLI(compositeReport: {
  [reportName: string]: Partial<TextReport & ImageChartsReport & ChartReport>;
}): void {
  for (const [name, simpleReport] of Object.entries(compositeReport)) {
    console.log();
    if (simpleReport.text) {
      for (const textLine of simpleReport.text) {
        console.log(textLine);
      }
    }
    if (simpleReport.imageChartsChart) {
      console.log(
        "- ImagesCharts Chart: ",
        simpleReport.imageChartsChart.toURL(),
      );
    }
    if (simpleReport.bufferChart) {
      const filePath = createTmpImageFile(name, simpleReport.bufferChart);
      console.log("- Buffer Chart: ", filePath);
    }
  }
}

function createTmpImageFile(name: string, buffer: Buffer): string {
  const tempDir = os.tmpdir();
  const fileName = `${name}-${Date.now()}.png`;
  const filePath = `${tempDir}/${fileName}`;

  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Outputs CSV of total metrics since the start of tracking them,
 * while skipping cohort analytis because that would be too complex.
 * Useful for manually producing charts that show total progress of Wasp.
 */
function printAllTimeMonthlyReportCsvInCLI(
  allTimePeriodReort: AllTimePeriodReport,
): void {
  const { userActivityReport, projectsReport } = allTimePeriodReort;

  console.log("\n[CSV] Num active users");
  for (const row of userActivityReport.csv) {
    console.log(row.join(","));
  }

  console.log("\n[CSV] Num projects");
  console.log("created diff,created cumm,built diff,built cumm");
  for (const row of projectsReport.csv) {
    console.log(row.join(","));
  }
}

cliReport().catch((e) => {
  const message = getAnalyticsErrorMessage(e);
  logger.error(message);
});
