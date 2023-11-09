const { fetchEventsForReportGenerator } = require('./events')
const { generateTotalReport } = require('./totalReport')
const { generatePeriodReport } = require('./periodReport')

// TODO: Track how long it takes to produce the reports.
// TODO: Optimize, I mostly ignored performance for now since we haven't had the amount of
// events where it would matter, but now we are getting there.

async function generateDailyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  numPeriods = numPeriods ?? 14;
  return generatePeriodReport(numPeriods, 'day', prefetchedEvents, false)
}

async function generateWeeklyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  numPeriods = numPeriods ?? 12;
  return generatePeriodReport(numPeriods, 'week', prefetchedEvents)
}

async function generateMonthlyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  numPeriods = numPeriods ?? 12;
  return generatePeriodReport(numPeriods, 'month', prefetchedEvents)
}

module.exports = {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateWeeklyReport,
  generateDailyReport,
  generateMonthlyReport
}