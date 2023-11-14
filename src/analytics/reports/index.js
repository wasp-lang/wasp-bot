const { fetchEventsForReportGenerator } = require('./events')
const { generateTotalReport } = require('./totalReport')
const { generatePeriodReport } = require('./periodReport')

async function generateDailyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  return generatePeriodReport(numPeriods ?? 14, 'day', prefetchedEvents, false)
}

async function generateWeeklyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  return generatePeriodReport(numPeriods ?? 12, 'week', prefetchedEvents)
}

async function generateMonthlyReport (prefetchedEvents = undefined, numPeriods = undefined) {
  return generatePeriodReport(numPeriods ?? 12, 'month', prefetchedEvents)
}

module.exports = {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateWeeklyReport,
  generateDailyReport,
  generateMonthlyReport
}
