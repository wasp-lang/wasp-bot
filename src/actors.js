// Defines all the actors that can send telemetry data to PostHog
// - "id" is used internally
// - "contextKey" is used to identify the actor from the Posthog event context field
// - "name" is used to display the actor in the output
const actors = {
    user: { id: "user", contextKey: "user", name: "User" },
    replit: { id: "replit", contextKey: "replit", name: "Replit" },
    gitpod: { id: "gitpod", contextKey: "gitpod", name: "Gitpod" },
    codespaces: {
        id: "codespaces",
        contextKey: "codespaces",
        name: "GH Codespaces"
    },
    ci: { id: "ci", contextKey: "ci", name: "CI" }
};

const nonUserActors = Object.values(actors).filter(
    (actor) => actor.id !== "user"
);

// Given [1, 2, 3] and ["gitpod", "replit", "ci"]
// returns a string "[Gitpod: 1] [Replit: 2] [CI: 3]"
function getActorsOutputFromCounts(counts) {
    const output = [];
    for (const actor of nonUserActors) {
        output.push(`[${actor.name}: ${counts[actor.id]}]`);
    }
    return output.join(" ");
}

module.exports = {
    actors,
    nonUserActors,
    getActorsOutputFromCounts
};
