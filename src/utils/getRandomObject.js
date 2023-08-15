module.exports.getRandomObject = function (obj) {
    var keys = Object.keys(obj);
    return obj[keys[(keys.length * Math.random()) << 0]];
};
