const _ = require("lodash");

const { getEventContextValues } = require("./eventContext");

// Defines all non-local execution environemnts from which Wasp CLI sends
// telemetry data to PostHog
// - "contextKey" is used to identify the execution env in the event context
// - "name" is used to display the env in the output
const executionEnvs = {
    replit: { contextKey: "replit", name: "Replit" },
    gitpod: { contextKey: "gitpod", name: "Gitpod" },
    codespaces: {
        contextKey: "codespaces",
        name: "GH Codespaces"
    },
    ci: { contextKey: "ci", name: "CI" }
};

// Organize events by the execution env:
//   - non-local: e.g. Replit, Gitpod, Github Codepsaces, CI, ... .
//   - local: User running Wasp on their computer.
function groupEventsByExecutionEnv(events) {
    const eventsWithExecutionEnv = events.map((e) => {
        const executionEnv = getExecutionEnvFromEventContext(e);
        return { ...e, _executionEnv: executionEnv };
    });
    const [localEvents, nonLocalEvents] = _.partition(
        eventsWithExecutionEnv,
        (e) => {
            return e._executionEnv === null;
        }
    );
    const groupedNonLocalEvents = _.groupBy(nonLocalEvents, (e) => {
        return e._executionEnv;
    });
    return {
        localEvents,
        groupedNonLocalEvents
    }
}

function getExecutionEnvFromEventContext(event) {
    const contextValues = getEventContextValues(event);
    for (let [key, actor] of Object.entries(executionEnvs)) {
        if (contextValues.includes(actor.contextKey)) {
            return key;
        }
    }
    return null;
}

// Takes metrics by execution env, and returns a pretty string representation of them.
// Given
//   `{ ci: 5, gitpod: 2 }`
// Where ci and gitpod are keys in `executionEnvs` and 5 and 2 are metric values,
// It returns:
//   `"[CI: 5] [Gitpod: 2]"`
function showPrettyMetrics(metricsByEnv) {
    const output = [];
    for (const [key, metric] of Object.entries(metricsByEnv)) {
        const context = executionEnvs[key];
        output.push(`[${context.name}: ${metric}]`);
    }
    return output.join(" ");
}

module.exports = {
    executionEnvs,
    groupEventsByExecutionEnv,
    showPrettyMetrics
};
