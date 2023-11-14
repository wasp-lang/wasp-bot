const Table = require('cli-table')

const moment = require('../../moment')
const { executionEnvs, groupEventsByExecutionEnv } = require('../../executionEnvs')
const { fetchEventsForReportGenerator } = require('../events')

const { groupEventsByUser, getIntersection, elemFromBehind } = require('../utils')

const { calcLastNPeriods, uniqueUserIdsInPeriod } = require('./common')


async function generateCohortRetentionReport (
  numPeriods, periodName, prefetchedEvents = undefined
) {
  const periodNameShort = periodName[0]

  // All events, sort by time (starting with oldest), with events caused by Wasp team members
  // filtered out.
  const events = prefetchedEvents ?? await fetchEventsForReportGenerator()

  const { localEvents } = groupEventsByExecutionEnv(events)

  const periods = calcLastNPeriods(numPeriods, periodName)

  // [<active_users_at_period_0>, <active_users_at_period_1>, ...]
  const activeUsersAtPeriod = periods.map(p => uniqueUserIdsInPeriod(localEvents, p))

  const eventsByUser = groupEventsByUser(localEvents)

  // Finds all users that have their first event in the specified period.
  function findNewUsersForPeriod ([pStart, pEnd]) {
    return (
      Object.entries(eventsByUser)
        .filter(([, eventsOfUser]) => {
          const timeOfFirstEvent = moment.min(eventsOfUser.map(e => moment(e.timestamp)))
          return timeOfFirstEvent.isSameOrBefore(pEnd) && timeOfFirstEvent.isAfter(pStart)
        })
        .map(([userId]) => userId)
    )
  }

  // [
  //   [cohort_0_after_0_periods, cohort_0_after_1_period, ...],
  //   [cohort_1_after_0_periods, cohort_1_after_1_period, ...],
  // ]
  // where each value is number of users from that cohort remaining at that period.
  const cohorts = []
  for (let i = 0; i < periods.length; i++) {
    const cohort = []
    const cohortUsers = findNewUsersForPeriod(periods[i])
    cohort.push(cohortUsers.length)
    for (let j = i + 1; j < periods.length; j++) {
      const users = Array.from(getIntersection(
        new Set(cohortUsers),
        new Set(activeUsersAtPeriod[j])
      ))
      cohort.push(users.length)
    }
    cohorts.push(cohort)
  }

  const table = new Table({
    head: [""].concat(periods.map((p, i) => `+${i}${periodNameShort}`)),
    colAligns: ["right", ...periods.map(() => "right")],
    // Options below remove all the decorations and colors from the table,
    // which makes it easier for us to print it to Discord later.
    // If you want some nicer visuals, comment out options below (.chars and .style).
    chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' , 'middle': ' ' },
    style: { 'head': null }
  });

  /**
   * @param {[number]} cohort [num_users_at_start, num_users_after_1_period, ...]
   * @returns {[string]} [num_users_at_start, num_and_perc_users_after_1_period, ...]
   *   Examples of returned value:
   *    - `["10", "6 (60%)", "3 (30%)", "0 (0%)"]`
   *    - `["0", "N/A", "N/A"]`
   */
  function calcCohortRetentionTableRow(cohort) {
    const [numUsersAtStart, ...numUsersThroughPeriods] = cohort;
    const retentionPercentages = numUsersThroughPeriods.map(n =>
      numUsersAtStart === 0
        ? "N/A"
        : `${n} (${Math.round(n / numUsersAtStart * 100)}%)`
    );
    return [numUsersAtStart.toString(), ...retentionPercentages];
  }

  table.push(
    ...cohorts.map((cohort, i) => ({
      [`${periodNameShort} #${i}`]: calcCohortRetentionTableRow(cohort)
    }))
  )

  const fmt = m => m.format('DD-MM-YY')
  const firstPeriod = periods[0]
  const lastPeriod = elemFromBehind(periods, 0)
  const report = [{
    text: [
      "```",
      table.toString(),
      "```",
      `Period of ${periodNameShort}  #0: ${fmt(firstPeriod[0])} - ${fmt(firstPeriod[1])}`,
      `Period of ${periodNameShort} #${periods.length-1}: ${fmt(lastPeriod[0])} - ${fmt(lastPeriod[1])}`
    ]
  }]
  return report
}


module.exports = {
  generateCohortRetentionReport
}
