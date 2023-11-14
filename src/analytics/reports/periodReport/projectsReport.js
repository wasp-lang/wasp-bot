import moment from '../../moment'
import { groupEventsByExecutionEnv } from '../../executionEnvs'
import { fetchEventsForReportGenerator } from '../events'
import { groupEventsByProject } from '../utils'

import { calcLastNPeriods } from './common'


export async function generatePeriodProjectsReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const events = prefetchedEvents ?? await fetchEventsForReportGenerator()

  const { localEvents } = groupEventsByExecutionEnv(events)

  const periods = calcLastNPeriods(numPeriods, periodName)

  const localEventsByProject = groupEventsByProject(localEvents)

  const calcProjectCreationTime = (allProjectEvents) => {
    return moment.min(allProjectEvents.map(e => moment(e.timestamp)))
  }

  const projectCreationTimes = Object.values(localEventsByProject).map(events => calcProjectCreationTime(events))
  // [num_projects_created_before_end_of_period_0, num_projects_created_before_end_of_period_1, ...]
  const numProjectsCreatedTillPeriod =
        periods.map(([, pEnd]) => projectCreationTimes.filter(t => t.isSameOrBefore(pEnd)).length)

  const calcProjectFirstBuildTime = (allProjectEvents) => {
    const buildEvents = allProjectEvents.filter(e => e.properties.is_build)
    return buildEvents.length == 0 ? undefined : moment.min(buildEvents.map(e => moment(e.timestamp)))
  }

  const projectFirstBuildTimes = Object.values(localEventsByProject)
                                  .map(events => calcProjectFirstBuildTime(events))
                                  .filter(buildTime => buildTime)
  // [num_projects_built_before_end_of_period_0, num_projects_built_before_end_of_period_1, ...]
  const numProjectsBuiltTillPeriod =
        periods.map(([, pEnd]) => projectFirstBuildTimes.filter(t => t.isSameOrBefore(pEnd)).length)

  const report = [
    {
      text: [
        '==== Projects created/built ====',
        "Num projects created by period end (cumm):",
        numProjectsCreatedTillPeriod.join(" "),
        "Num projects built by period end (cumm):",
        numProjectsBuiltTillPeriod.join(" ")
      ]
    }
  ]
  return report
}
