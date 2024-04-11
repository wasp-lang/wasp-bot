import {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateAllTimeMonthlyReport,
} from "./reports";

async function cliReport() {
  const events = await fetchEventsForReportGenerator();

  printTitle("TOTAL REPORT");
  showReportInCLI(await generateTotalReport(events));

  printTitle("DAILY REPORT");
  showReportInCLI(await generateDailyReport(events));

  printTitle("WEEKLY REPORT");
  showReportInCLI(await generateWeeklyReport(events));

  printTitle("MONTHLY REPORT");
  showReportInCLI(await generateMonthlyReport(events));

  printTitle("ALL TIME MONTHLY REPORT (CSVs)");
  await allTimeMonthlyActiveUsersAndProjectsCsvCliReport(events);
}

// Outputs CSV of total metrics since the start of tracking them,
// while skipping cohort analytis because that would be too complex.
// Useful for manually producing charts that show total progress of Wasp.
async function allTimeMonthlyActiveUsersAndProjectsCsvCliReport(events) {
  const report = await generateAllTimeMonthlyReport(events);

  console.log("\n[CSV] Num active users");
  const activeUsersReport = report[0];
  for (const row of activeUsersReport.csv) {
    console.log(row.join(","));
  }

  console.log("\n[CSV] Num projects");
  console.log(",created diff,created cumm,built diff,built cumm");
  const projectsReport = report[1];
  for (const row of projectsReport.csv) {
    console.log(row.join(","));
  }
}

function showReportInCLI(report) {
  for (const metric of report) {
    console.log();
    if (metric.text) {
      for (const textLine of metric.text) {
        console.log(textLine);
      }
    }
    if (metric.chart) {
      console.log("- Chart: ", metric.chart.toURL());
    }
  }
}

function printTitle(text) {
  console.log(`\x1b[33m \n\n${text} \x1b[0m`);
}

cliReport();
