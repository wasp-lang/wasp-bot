// Defines all 3rd party contexts that can send telemetry data to PostHog
// - "contextKey" is used to identify the context in the event properties
// - "name" is used to display the context in the output
const thirdPartyContexts = {
    replit: { contextKey: "replit", name: "Replit" },
    gitpod: { contextKey: "gitpod", name: "Gitpod" },
    codespaces: {
        contextKey: "codespaces",
        name: "GH Codespaces"
    },
    ci: { contextKey: "ci", name: "CI" }
};

module.exports = {
    thirdPartyContexts,
};
