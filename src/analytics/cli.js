const {
    fetchEventsForReportGenerator,
    generateTotalReport,
    generateDailyReport,
    generateWeeklyReport,
    generateMonthlyReport
} = require("./analytics");

fetchEventsForReportGenerator().then((events) => {
    generateTotalReport(events).then((report) => {
        printTitle("TOTAL REPORT");
        showReportInCLI(report);
    });

    generateDailyReport(events).then((report) => {
        printTitle("DAILY REPORT");
        showReportInCLI(report);
    });

    generateWeeklyReport(events).then((report) => {
        printTitle("WEEKLY REPORT");
        showReportInCLI(report);
    });

    generateMonthlyReport(events).then((report) => {
        printTitle("MONTHLY REPORT");
        showReportInCLI(report);
    });
});

async function showReportInCLI(report) {
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
