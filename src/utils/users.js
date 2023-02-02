const moment = require('moment')

function findUsersFirstActivity(eventsOfUser) {
    return moment.min(eventsOfUser.map((e) => moment(e.timestamp)));
}

module.exports = {
    findUsersFirstActivity,
}
