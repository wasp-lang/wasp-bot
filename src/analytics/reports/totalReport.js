const {
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} = require('../executionEnvs')
const { fetchEventsForReportGenerator } = require('./events')

const { groupEventsByProject } = require('./utils')

// Generates report for some general statistics that cover the whole (total) time (all of the events).
async function generateTotalReport (prefetchedEvents = undefined) {
  // All events, sort by time (starting with oldest), with events caused by Wasp team members filtered out.
  const events = prefetchedEvents ?? await fetchEventsForReportGenerator()

  const { localEvents, groupedNonLocalEvents } = groupEventsByExecutionEnv(events)

  const localEventsByProject = groupEventsByProject(localEvents)
  const numProjectsTotal = Object.keys(localEventsByProject).length
  const numProjectsBuiltTotal = Object.values(localEventsByProject)
    .filter(events => events.some(e => e.properties.is_build)).length
  const numUniqueUsersTotal = new Set(localEvents.map(e => e.distinct_id)).size

  const totalUniqueEventsByExecutionEnv = calcTotalUniqueEventsByExecutionEnv(groupedNonLocalEvents)
  const prettyNonLocalMetrics = showPrettyMetrics(totalUniqueEventsByExecutionEnv);

  const report = [
    {
      text: [
        `Number of unique projects in total: ${numProjectsTotal}`,
        `Number of unique projects built in total: ${numProjectsBuiltTotal}`,
        `Number of unique users in total: ${numUniqueUsersTotal}`,
        ` - ${prettyNonLocalMetrics}`
      ]
    }
  ]

  return report
}

function calcTotalUniqueEventsByExecutionEnv(eventsByEnv) {
  const totalUniqueEventsByExecutionEnv = {};
  for (let envKey of Object.keys(executionEnvs)) {
    const events = eventsByEnv[envKey] ?? []
    totalUniqueEventsByExecutionEnv[envKey] = new Set(events.map(e => e.distinct_id)).size
  }
  return totalUniqueEventsByExecutionEnv;
}

module.exports = {
  generateTotalReport
}
