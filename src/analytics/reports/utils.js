const _ = require('lodash')

const moment = require('../moment')

/**
 * @param {[PosthogEvent]} events
 * @returns {{ [string]: [PosthogEvent] }} Key is unique project id, value is a list of events that belong to it.
 */
function groupEventsByProject(events) {
  return _.groupBy(events, e => e.distinct_id + e.properties.project_hash)
}

/**
 * @param {[PosthogEvent]} events
 * @returns {{ [string]: [PosthogEvent] }} Key is unique user id, value is a list of events that belong to it.
 */
function groupEventsByUser (events) {
  return _.groupBy(events, e => e.distinct_id)
}

function getIntersection(setA, setB) {
  return new Set([...setA].filter(element => setB.has(element)))
}

function calcUserAgeInDays (newestEvent, oldestEvent) {
  return moment(newestEvent.timestamp).diff(moment(oldestEvent.timestamp), 'days') + 1
}

module.exports = {
  groupEventsByProject,
  groupEventsByUser,
  getIntersection,
  calcUserAgeInDays
}
