// TODO: we should probably refactor naming here
// - actor could be renamed to context
// - user actor could be renamed to local context
const userActorKey = 'user';
// Defines all the actors that can send telemetry data to PostHog
// - "contextKey" is used to identify the actor in the event context
// - "name" is used to display the actor in the output
const actors = {
    // TODO: user is a special case, we should probably remove it in the future
    [userActorKey]: { name: "User" },
    replit: { contextKey: "replit", name: "Replit" },
    gitpod: { contextKey: "gitpod", name: "Gitpod" },
    codespaces: {
        contextKey: "codespaces",
        name: "GH Codespaces"
    },
    ci: { contextKey: "ci", name: "CI" }
};

const nonUserActors = Object.fromEntries(
    Object.entries(actors).filter(([, actor]) => actor !== actors.user)
);

// Given [1, 2, 3] and ["gitpod", "replit", "ci"]
// returns a string "[Gitpod: 1] [Replit: 2] [CI: 3]"
function getPrettyActorMetrics(metricsByActor) {
    const output = [];
    for (const [actorKey, metric] of Object.entries(metricsByActor)) {
        const actor = actors[actorKey];
        output.push(`[${actor.name}: ${metric}]`);
    }
    return output.join(" ");
}

module.exports = {
    actors,
    nonUserActors,
    userActorKey,
    getPrettyActorMetrics
};
