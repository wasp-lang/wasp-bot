const axios = require('axios')
const _ = require('lodash')
const moment = require('moment')
const Table = require('cli-table')
const { actors, nonUserActors, getActorsOutputFromCounts } = require('./actors')
const { buildChartImageUrl } = require('./charts')

require('dotenv').config()

const POSTHOG_KEY = process.env.WASP_POSTHOG_KEY

// Here we set moment to use ISO-8601, Europe locale.
moment.updateLocale("en", { week: {
  dow: 1, // First day of week is Monday
  doy: 4  // First week of year must contain 4 January (7 + 1 - 4)
}});

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

// This is executed when this file is run as a script.
if (require.main === module) {
  fetchEventsForReportGenerator().then(events => {
    generateTotalReport(events).then(report => {
      console.log('\n\nTOTAL REPORT')
      showReportInCLI(report)
    })

    generateDailyReport(events).then(report => {
      console.log('\n\nDAILY REPORT')
      showReportInCLI(report)
    })

    generateWeeklyReport(events).then(report => {
      console.log('\n\nWEEKLY REPORT')
      showReportInCLI(report)
    })

    generateMonthlyReport(events).then(report => {
      console.log('\n\nMONTHLY REPORT')
      showReportInCLI(report)
    })
  })
}


async function generateDailyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(14, 'day', prefetchedEvents, false)
}

async function generateWeeklyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(12, 'week', prefetchedEvents)
}

async function generateMonthlyReport (prefetchedEvents = undefined) {
  return generatePeriodReport(12, 'month', prefetchedEvents)
}


// TODO: Track how long it took to run the analysis.
// TODO: Optimize, I mostly ignored performance for now since we don't yet have amount of events where it would matter.

// Main function of this module.
//
// Generates a report that calculates usage for last numPeriod periods of size periodName,
// where periodName should be 'day' or 'week' or 'month'.
// Each period is a central time scope of calculation.
//
// You can optionally pass prefetched events, in which case you should make sure
// they are prepared (our events removed, sorted) and that they are all events available for CLI,
// for the whole history. You should obtain them with fetchAllCliEvents(), in that case they will
// be all good.
async function generatePeriodReport (numPeriods, periodName, prefetchedEvents = undefined, genCohortRetentionReport = true) {
  const events = prefetchedEvents || await fetchEventsForReportGenerator()

  const report = [
    ... await generateUserActivityReport(numPeriods, periodName, events),
    ...(genCohortRetentionReport ? await generateCohortRetentionReport(numPeriods, periodName, events) : []),
    ... await generatePeriodProjectsReport(numPeriods, periodName, events),
  ]
  return report
}

async function generatePeriodProjectsReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const events = prefetchedEvents || await fetchEventsForReportGenerator()

  const eventsByActor = organizeEventsByActor(events)
  const userEvents = eventsByActor[actors.user] || []

  const periods = calcLastNPeriods(numPeriods, periodName)

  const userEventsByProject = groupEventsByProject(userEvents)

  const calcProjectCreationTime = (allProjectEvents) => {
    return moment.min(allProjectEvents.map(e => moment(e.timestamp)))
  }

  const projectCreationTimes = Object.values(userEventsByProject).map(events => calcProjectCreationTime(events))
  // [num_projects_created_before_end_of_period_0, num_projects_created_before_end_of_period_1, ...]
  const numProjectsCreatedTillPeriod =
        periods.map(([, pEnd]) => projectCreationTimes.filter(t => t.isSameOrBefore(pEnd)).length)

  const calcProjectFirstBuildTime = (allProjectEvents) => {
    const buildEvents = allProjectEvents.filter(e => e.properties.is_build)
    return buildEvents.length == 0 ? undefined : moment.min(buildEvents.map(e => moment(e.timestamp)))
  }

  const projectFirstBuildTimes = Object.values(userEventsByProject).map(es => calcProjectFirstBuildTime(es)).filter(bt => bt)
  // [num_projects_built_before_end_of_period_0, num_projects_built_before_end_of_period_1, ...]
  const numProjectsBuiltTillPeriod =
        periods.map(([, pEnd]) => projectFirstBuildTimes.filter(t => t.isSameOrBefore(pEnd)).length)

  const report = [
    {
      text: [
        "Num projects created by period end (cumm):",
        numProjectsCreatedTillPeriod.join(" "),
        "Num projects built by period end (cumm):",
        numProjectsBuiltTillPeriod.join(" ")
      ]
    }
  ]
  return report
}

async function generateUserActivityReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const events = prefetchedEvents || await fetchEventsForReportGenerator()
  const periods = calcLastNPeriods(numPeriods, periodName)

  const eventsByActor = organizeEventsByActor(events)

  const userEvents = eventsByActor[actors.user] || []
  const uniqueUsersPerPeriodByAge = calcUniqueUsersPerPeriodByAge(userEvents, periods)

  const uniqueUsersByActorInPeriod = getUniqueUsersByActorInPeriod(periods, eventsByActor);
  const nonUserActorsOutput = getActorsOutputFromCounts(uniqueUsersByActorInPeriod);

  const report = [ {
    text: [
      'Number of unique active users:',
      `- During last ${periodName}: `
        + _.sum(Object.values(uniqueUsersPerPeriodByAge.series).map(s => elemFromBehind(s, 0))),
      `  - ${nonUserActorsOutput}`
    ],
    chart: buildChartImageUrl(
      uniqueUsersPerPeriodByAge,
      `Num unique active users (per ${periodName})`,
      'bars'
    )
  } ]

  return report
}

function getUniqueUsersByActorInPeriod(periods, eventsByActor, actors = nonUserActors) {
  const uniqueUsersByActorInPeriod = {};
  for (let actor of actors) {
    const events = eventsByActor[actor] || []
    uniqueUsersByActorInPeriod[actor] = uniqueUserIdsInPeriod(events, elemFromBehind(periods, 0)).length
  }
  return uniqueUsersByActorInPeriod;
}

// Generates report for some general statistics that cover the whole (total) time (all of the events).
async function generateTotalReport (prefetchedEvents = undefined) {
  // All events, sort by time (starting with oldest), with events caused by Wasp team members filtered out.
  const events = prefetchedEvents || await fetchEventsForReportGenerator()

  const eventsByActor = organizeEventsByActor(events)

  const userEvents = eventsByActor[actors.user] || []
  const userEventsByProject = groupEventsByProject(userEvents)

  const totalUniqueUsersByActor = getTotalUniqueUsersByActor(eventsByActor)
  const nonUserActorsOutput = getActorsOutputFromCounts(totalUniqueUsersByActor);

  const numProjectsTotal = Object.keys(userEventsByProject).length
  const numProjectsBuiltTotal = Object.values(userEventsByProject)
        .filter(events => events.some(e => e.properties.is_build)).length
  const numUniqueUsersTotal = new Set(userEvents.map(e => e.distinct_id)).size

  const report = [
    { text: [
      'Number of unique projects in total: ' + numProjectsTotal,
      'Number of unique projects built in total: ' + numProjectsBuiltTotal,
      'Number of unique users in total: ' + numUniqueUsersTotal,
      ` - ${nonUserActorsOutput}`
    ] }
  ]
  return report
}

function getTotalUniqueUsersByActor(eventsByActor, actors = nonUserActors) {
  const totalUniqueUsersByActor = {};
  for (let actor of actors) {
    const events = eventsByActor[actor] || []
    totalUniqueUsersByActor[actor] = new Set(events.map(e => e.distinct_id)).size
  }
  return totalUniqueUsersByActor;
}

async function generateCohortRetentionReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const periodNameShort = periodName[0]

  // All events, sort by time (starting with oldest), with events caused by Wasp team members filtered out.
  const events = prefetchedEvents || await fetchEventsForReportGenerator()

  const userEvents = organizeEventsByActor(events)[actors.user] || []

  const periods = calcLastNPeriods(numPeriods, periodName)

  // [<active_users_at_period_0>, <active_users_at_period_1>, ...]
  const activeUsersAtPeriod = periods.map(p => uniqueUserIdsInPeriod(userEvents, p))

  const eventsByUser = groupEventsByUser(userEvents)

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

  table.push(
    ...cohorts.map((c, i) => ({
      [`${periodNameShort} #${i}`]: [c[0], ...(c.slice(1).map(n =>
        c[0] == 0 ? "N/A" : `${n} (${Math.round(n / c[0] * 100)}%)`
      ))]
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

function getIntersection(setA, setB) {
  return new Set([...setA].filter(element => setB.has(element)))
}

async function fetchEventsForReportGenerator () {
  const allEvents = await fetchAllCliEvents()
  console.log('\nNumber of CLI events fetched:', allEvents.length)
  return _.sortBy(
    allEvents.filter(e => !ourDistinctIds.includes(e.distinct_id) ),
    'timestamp')
}

async function fetchAllCliEvents () {
  return fetchEvents('https://app.posthog.com/api/event/?event=cli')
}

// TODO: Make it so that we fetch events only once! And then we reuse them.
//   Maybe we could have cache for event queries? All of these even queries with
//   older dates -> they will never change. So can I store them in some kind of in-memory cache?
//   Or maybe even store them on disk? In tmp files?
//   The thing is, posthog fetches first 100 events, and the passes the next 100 and so on,
//   so requests are always differently scoped as time goes. What we could do though is:
//   When we fetch events, we remember the date we did the fetching for, and we store them
//   under that date. We store them somewhere like a file or in memory.
//   Then, the next time we are fetching events, we start from that date, and fetch only
//   the events that older than those, and once we are done, we add them to that file and update
//   its date to be the newest one. That way we always maintain the pretty up-to-date list of
//   all the events, and we only need to fetch new ones.
//   Posthog accepts time period as an argument for fetching events so this will work.
//   What happens if we lose our "cache" though? Then we need to fetch all of them at once.
//   That might fail because posthog can complain when we are fetching too much events at once,
//   and what happens is that it fetches a couple batches of 100 of them and then dies.
//   So we should be smart about that, find a way to "cache" what it downloaded before we retry it,
//   so we don't always start from 0.
async function fetchEvents (url) {
  console.log('Fetching: ' + url)
  const response = await axios.get(url, { headers: {
    'Authorization': 'Bearer ' + POSTHOG_KEY
  }})
  const { next, results } = response.data
  const restOfResults = next ? await fetchEvents(next) : []
  return results.concat(restOfResults)
}

// Organize events by the actors / source: Replit, Gitpod, Github Codepsaces, CI, or the normal usage (actors.user).
// We are most interested in normal usage, which is why we want to do this separation,
// but we also do some analysis on the rest of events.
function organizeEventsByActor (events) {
  return _.groupBy(events, e => {
    const contextValues = e.properties.context?.split(" ").map(v => v.toLowerCase()) || []
    if (contextValues.includes(actors.ci)) return actors.ci
    if (contextValues.includes(actors.gitpod)) return actors.gitpod
    if (contextValues.includes(actors.codespaces)) return actors.codespaces
    if (contextValues.includes(actors.replit)) return actors.replit
    return actors.user
  })
}

// periodName should be 'day', 'week', or 'month'.
// This will return last numPeriods complete periods with the length of periodName.
// Returns: [[periodStartDateTime, periodEndDateTime]].
function calcLastNPeriods (numPeriods, periodName) {
  const startDate = moment().subtract(numPeriods, periodName).startOf(periodName)
  const periods = []
  for (let i = 0; i < numPeriods; i++) {
    periods.push([moment(startDate), moment(startDate).endOf(periodName)])
    startDate.add(1, periodName).startOf(periodName)
  }
  return periods
}

// The main metric we are calculating -> for each period, number of unique users, grouped by age (of usage).
// We return it ready for displaying via chart or table.
// Takes list of all events, ends of all periods, and period duration.
function calcUniqueUsersPerPeriodByAge (userEvents, periods) {
  const uniqueUsersPerPeriodByAge = {
    // All series have the same length, which is the length of .periodEnds.
    series: {
      ">30d": [], // [number]
      "(5, 30]d": [],
      "(1, 5]d": [],
      "<=1d": []
    },
    periodEnds: [] // [string] where strings are dates formatted as YY-MM-DD.
  }
  for (let period of periods) {
    const ids = uniqueUserIdsInPeriod(userEvents, period)
    const ages = ids.map(id => (calcUserAgeInDays(userEvents, id)))
    uniqueUsersPerPeriodByAge.series["<=1d"].push(ages.filter(age => age <= 1).length)
    uniqueUsersPerPeriodByAge.series["(1, 5]d"].push(ages.filter(age => age > 1 && age <= 5).length)
    uniqueUsersPerPeriodByAge.series["(5, 30]d"].push(ages.filter(age => age > 5 && age <= 30).length)
    uniqueUsersPerPeriodByAge.series[">30d"].push(ages.filter(age => age > 30).length)

    uniqueUsersPerPeriodByAge.periodEnds.push(period[1].format('YY-MM-DD'))
  }
  return uniqueUsersPerPeriodByAge
}

// { <unique_project_id>: [<project_event>] }
function groupEventsByProject (events) {
  return _.groupBy(events, e => e.distinct_id + e.properties.project_hash)
}

// { <unique_user_id>: [<user_event>] }
function groupEventsByUser (events) {
  return _.groupBy(events, e => e.distinct_id)
}

// From given events, calculates the age of user with specified user id (distinctId),
// where age is defined as number of days between user's first event and their last event.
// Assumes events are sorted from oldest to newest.
function calcUserAgeInDays (events, distinctId) {
  const oldestEvent = _.find(events, e => e.distinct_id == distinctId)
  const newestEvent = _.findLast(events, e => e.distinct_id == distinctId)
  return moment(newestEvent.timestamp).diff(moment(oldestEvent.timestamp), 'days') + 1
}

async function showReportInCLI (report) {
  for (const metric of report) {
    console.log()
    if (metric.text) {
      for (const textLine of metric.text) {
        console.log(textLine)
      }
    }
    if (metric.chart) {
      console.log('- Chart: ', metric.chart.toURL())
    }
  }
}

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime).
function filterEventsInPeriod (es, [startTime, endTime]) {
  return es.filter(e => moment(e.timestamp).isSameOrBefore(endTime) && moment(e.timestamp).isAfter(startTime))
}

// Based on given events, finds all unique users that were active in the given period
// and returns their ids.
function uniqueUserIdsInPeriod (es, period) {
  return Array.from(new Set(filterEventsInPeriod(es, period).map(e => e.distinct_id)))
}

// elemFromBehind([1,2,3], 0) == 3
function elemFromBehind (arr, i) { return arr[arr.length - 1 - i] }

module.exports = {
  fetchEventsForReportGenerator,
  generateTotalReport,
  generateWeeklyReport,
  generateDailyReport,
  generateMonthlyReport
}

