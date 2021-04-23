const axios = require('axios')
const _ = require('lodash')
const moment = require('moment')
const ImageCharts = require('image-charts');

const POSTHOG_KEY = process.env.WASP_POSTHOG_KEY

ourDistinctIds = [
  'bf3fa7a8-1c11-4f82-9542-ec1a2d28786b',
  '53669068-7441-45eb-b11b-880ad4c9c8c2',
  '380cc449-78db-4bd9-ae29-790e892c63a9',
  '7b9d8578-120c-4c2a-b4a7-3994d2801a24',
  'e7cd9e56-2766-4eb6-9e5c-44ecb9014690'
]

const generateReport = async () => {

  // TODO: Track how long it took to run the analysis.
  // TODO: Optimize stuff below, I ignored performance for now since we don't yet have amount of events where it would matter.

  firstSunday = moment().subtract(3, 'months').day('Sunday')

  const events = (await fetchEvents('https://app.posthog.com/api/event/?event=cli'))
        .filter(e => !ourDistinctIds.includes(e.distinct_id) )

  console.log('\nNumber of CLI events so far:', events.length)

  const eventsByProject = _.groupBy(events, e => e.distinct_id + e.properties.project_hash)

  const numProjectsCreatedUntilDatetime = (datetime) => {
    return Object.values(eventsByProject)
      .map(events => moment.min(events.map(e => moment(e.timestamp))))
      .filter(dt => dt.isSameOrBefore(datetime))
      .length
  }

  const numProjectsBuiltUntilDatetime = (datetime) => {
    return Object.values(eventsByProject)
      .map(events => events.filter(e => e.properties.is_build))
      .map(events => moment.min(events.map(e => moment(e.timestamp))))
      .filter(dt => dt.isSameOrBefore(datetime))
      .length
  }

  const numUniqueUsersInPeriod = (startTime, endTime) => {
    return new Set(
      events
        .filter(e => moment(e.timestamp).isSameOrBefore(endTime) && moment(e.timestamp).isAfter(startTime))
        .map(e => e.distinct_id)
    ).size
  }

  const numProjectsTotal = Object.keys(eventsByProject).length
  const numProjectsBuiltTotal = Object.values(eventsByProject).filter(events => events.some(e => e.properties.is_build)).length
  const numUniqueUsersTotal = new Set(events.map(e => e.distinct_id)).size

  const numProjectsCreatedPerWeekCumm = []
  const numProjectsBuiltPerWeekCumm = []
  const numUniqueUsersPerWeek = []
  {
    let sunday = moment(firstSunday).endOf('day')
    while (sunday.isBefore(moment.now())) {
      const numCreatedProjects = numProjectsCreatedUntilDatetime(sunday)
      const numBuiltProjects = numProjectsBuiltUntilDatetime(sunday)
      const numUniqueUsers = numUniqueUsersInPeriod(moment(sunday).subtract(7, 'days'), sunday)
      numProjectsCreatedPerWeekCumm.push({ weekEnd: sunday.format('YY-MM-DD'), count: numCreatedProjects })
      numProjectsBuiltPerWeekCumm.push({ weekEnd: sunday.format('YY-MM-DD'), count: numBuiltProjects})
      numUniqueUsersPerWeek.push({ weekEnd: sunday.format('YY-MM-DD'), count: numUniqueUsers})
      sunday.add(7, 'days')
    }
  }

  const cummulativeToDiff = (data) => {
    return data.slice(1).reduce(
      ({ lastCount, newData }, { weekEnd, count }) => {
        return { lastCount: count, newData: [...newData, { weekEnd, count: count - lastCount }] }
      },
      { lastCount: data[0].count, newData: [] }
    ).newData
  }

  const numProjectsCreatedPerWeek = cummulativeToDiff(numProjectsCreatedPerWeekCumm)
  const numProjectsBuiltPerWeek = cummulativeToDiff(numProjectsBuiltPerWeekCumm)

  const chartImage = (data, title, type='line') => {
    const chart = ImageCharts()
          .cht(type === 'line' ? 'ls' : 'bvs') // Type: lines or vertical bars? Could also be other things.
          .chtt(title) // Title.
          .chd('a:' + data.map(x => x.count).join(',')) // Data.
          .chl(data.map(x => x.count).join('|')) // Value labels on bars.
          .chxl('0:|' + data.map(x => x.weekEnd).join('|')) // X axis labels.
          .chxs('0,s,min45max45') // On x-axis (0), skip some labels (s) and use 45 degress angle (min45max45).
          .chs('700x400') // Size.
          .chg('20,20') // Solid or dotted grid lines.
          .chma('0,50,50') // Margins.
          .chxt('x,y') // Axes to show.
    return chart
  }
  const elemFromBehind = (arr, i) => arr[arr.length - 1 - i]

  report = [
    {
      text: ['Number of Wasp projects created:',
             '- During last week: ' + elemFromBehind(numProjectsCreatedPerWeek, 0).count,
             '- Total: ' + numProjectsTotal],
      chart: chartImage(numProjectsCreatedPerWeek, 'Num projects created (90 days, weeks)', 'bars')
    },
    {
      text: ['Number of Wasp projects built:',
             '- During last week: ' + elemFromBehind(numProjectsBuiltPerWeek, 0).count,
             '- Total: ' + numProjectsBuiltTotal],
      chart: chartImage(numProjectsBuiltPerWeek, 'Num projects built (90 days, weeks)', 'bars')
    },
    {
      text: ['Number of unique active users:',
             '- During last week: ' + elemFromBehind(numUniqueUsersPerWeek, 0).count,
             '- Total: ' + numUniqueUsersTotal],
      chart: chartImage(numUniqueUsersPerWeek, 'Num unique weekly active users (90 days)', 'bars')
    },
  ]

  return report
}

const fetchEvents = async (url) => {
  console.log('Fetching: ' + url)
  const response = await axios.get(url, { headers: {
    'Authorization': 'Bearer ' + POSTHOG_KEY
  }})
  const { next, results } = response.data
  return results.concat(next ? await fetchEvents(next) : [])
}

if (require.main === module) {
  generateReport().then(report => {
    for (const metric of report) {
      console.log()
      for (const textLine of metric.text) {
        console.log(textLine)
      }
      console.log('- Chart: ', metric.chart.toURL())
    }
  })
}

module.exports = {
  generateReport
}
