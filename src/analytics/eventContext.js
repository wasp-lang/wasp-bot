function getEventContextValues(event) {
    return event.properties.context?.split(" ").map((v) => v.toLowerCase()) || [];
}

module.exports = {
    getEventContextValues,
};
