import {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
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
