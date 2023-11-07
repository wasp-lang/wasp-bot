const _ = require('lodash')

const { fetchAllCliEvents } = require('../events')

const { generateTotalReport } = require('./totalReport')
const { generatePeriodReport } = require('./periodReport')

// TODO: Track how long it takes to produce the reports.
// TODO: Optimize, I mostly ignored performance for now since we haven't had the amount of
// events where it would matter, but now we are getting there.

async function generateDailyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(14, 'day', prefetchedEvents, false)
}

async function generateWeeklyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(12, 'week', prefetchedEvents)
}

async function generateMonthlyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(12, 'month', prefetchedEvents)
}

// These are telemetry user ids of Wasp team members
// from the situation when we accidentally left telemetry enabled.
// We track them here so we can ignore these events.
const ourDistinctIds = [
  'bf3fa7a8-1c11-4f82-9542-ec1a2d28786b',
  '53669068-7441-45eb-b11b-880ad4c9c8c2',
  '380cc449-78db-4bd9-ae29-790e892c63a9',
  '7b9d8578-120c-4c2a-b4a7-3994d2801a24',
  'e7cd9e56-2766-4eb6-9e5c-44ecb9014690',
  '8605f02d-5b32-466c-93d2-faaa787f43a0',
  'dc396135-c50d-4064-9563-5813056b1cc8'
]

async function fetchEventsForReportGenerator () {
  const allEvents = await fetchAllCliEvents()

  console.log('\nNumber of CLI events fetched:', allEvents.length)
  return _.sortBy(
    allEvents.filter(e => !ourDistinctIds.includes(e.distinct_id)),
    'timestamp')
}

module.exports = {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateWeeklyReport,
  generateDailyReport,
  generateMonthlyReport
}
