const _ = require('lodash')

const moment = require('../moment')


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


// elemFromBehind([1,2,3], 0) == 3
function elemFromBehind (arr, i) { return arr[arr.length - 1 - i] }

function getIntersection(setA, setB) {
  return new Set([...setA].filter(element => setB.has(element)))
}

module.exports = {
  groupEventsByProject,
  groupEventsByUser,
  calcUserAgeInDays,
  elemFromBehind,
  getIntersection
}
