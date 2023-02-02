// zip([[1,2],[3,4,5],[6,7]]) == [[1,3,6],[2,4,7]]
function zip(arrays) {
    const minLength = Math.min(...arrays.map((a) => a.length));
    const result = [];
    for (let i = 0; i < minLength; i++) {
        const values = [];
        for (let j = 0; j < arrays.length; j++) {
            values.push(arrays[j][i]);
        }
        result.push(values);
    }
    return result;
}

// sum([1,2,3]) == 6
function sum(numbers) {
    return numbers.reduce((s, x) => s + x, 0);
}

module.exports = {
    zip,
    sum,
};
