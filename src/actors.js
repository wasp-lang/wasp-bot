const actors = {
    user: "user",
    replit: "replit",
    ci: "ci",
    gitpod: "gitpod",
    codespaces: "codespaces"
};

const actorNames = {
    [actors.user]: "User",
    [actors.replit]: "Replit",
    [actors.ci]: "CI",
    [actors.gitpod]: "Gitpod",
    [actors.codespaces]: "GH Codespaces"
};

const nonUserActors = [
    actors.gitpod,
    actors.replit,
    actors.codespaces,
    actors.ci
];

// Given [1, 2, 3] and ["gitpod", "replit", "ci"]
// returns a string "[Gitpod: 1] [Replit: 2] [CI: 3]"
function getActorsOutputFromCounts(counts, actors = nonUserActors) {
    const output = [];
    for (const actor of actors) {
        output.push(`[${actorNames[actor]}: ${counts[actor]}]`);
    }
    return output.join(" ");
}

module.exports = {
    actors,
    nonUserActors,
    getActorsOutputFromCounts
};
