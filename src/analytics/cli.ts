import logger from "../utils/logger";
import { getAnalyticsErrorMessage } from "./errors";
import * as reports from "./reports";

async function cliReport() {
  const events = await reports.fetchEventsForReportGenerator();

  printTitle("TOTAL REPORT");
  showReportInCLI(await reports.generateTotalReport(events));

  printTitle("DAILY REPORT");
  showReportInCLI(await reports.generateDailyReport(events));

  printTitle("WEEKLY REPORT");
  showReportInCLI(await reports.generateWeeklyReport(events));

  printTitle("MONTHLY REPORT");
  showReportInCLI(await reports.generateMonthlyReport(events));

  printTitle("ALL TIME MONTHLY REPORT (CSVs)");
  await allTimeMonthlyActiveUsersAndProjectsCsvCliReport(events);
}

// Outputs CSV of total metrics since the start of tracking them,
// while skipping cohort analytis because that would be too complex.
// Useful for manually producing charts that show total progress of Wasp.
async function allTimeMonthlyActiveUsersAndProjectsCsvCliReport(events) {
  const report = await reports.generateAllTimeMonthlyReport(events);

  console.log("\n[CSV] Num active users");
  for (const row of report.userActivityReport.csv) {
    console.log(row.join(","));
  }

  console.log("\n[CSV] Num projects");
  console.log("created diff,created cumm,built diff,built cumm");
  for (const row of report.projectsReport.csv) {
    console.log(row.join(","));
  }
}

function showReportInCLI(compositeReport: reports.CompositeReport) {
  for (const report of Object.values(compositeReport)) {
    console.log();
    if (report.text) {
      for (const textLine of report.text) {
        console.log(textLine);
      }
    }
    if (report.chart) {
      console.log("- Chart: ", report.chart.toURL());
    }
  }
}

function printTitle(text) {
  console.log(`\x1b[33m \n\n${text} \x1b[0m`);
}

cliReport().catch((e) => {
  const message = getAnalyticsErrorMessage(e);
  logger.error(message);
});
