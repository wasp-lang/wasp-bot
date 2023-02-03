const _ = require("lodash");
const { thirdPartyContexts } = require(".");

// Organize events by the context: Replit, Gitpod, Github Codepsaces, CI, or the normal usage.
// We are most interested in normal usage, which is why we want to do this separation,
// but we also do some analysis on the rest of events.
function splitEventsByRegularUsageAnd3rdPartyContext(events) {
    const eventsWithContext = events.map((e) => {
        const context = getContextFromEvent(e);
        return { ...e, _waspContext: context };
    });
    const [regularUsageEvents, thirdPartyEvents] = _.partition(
        eventsWithContext,
        (e) => {
            return e._waspContext === null;
        }
    );
    const groupedThirdPartyEvents = _.groupBy(thirdPartyEvents, (e) => {
        return e._waspContext;
    });
    return [regularUsageEvents, groupedThirdPartyEvents];
}

function getContextFromEvent(event) {
    const contextValues =
        event.properties.context?.split(" ").map((v) => v.toLowerCase()) || [];
    for (let [key, actor] of Object.entries(thirdPartyContexts)) {
        if (contextValues.includes(actor.contextKey)) {
            return key;
        }
    }
    return null;
}

// Given [1, 2, 3] and ["gitpod", "replit", "ci"]
// returns a string "[Gitpod: 1] [Replit: 2] [CI: 3]"
function showPrettyMetrics(metricsByContext) {
    const output = [];
    for (const [contextKey, metric] of Object.entries(metricsByContext)) {
        const context = thirdPartyContexts[contextKey];
        output.push(`[${context.name}: ${metric}]`);
    }
    return output.join(" ");
}

module.exports = {
    splitEventsByRegularUsageAnd3rdPartyContext,
    showPrettyMetrics
};
