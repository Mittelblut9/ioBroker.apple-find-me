module.exports = {
    require: ['test/mocha.setup.js'],
    spec: [
        '!**/(node_modules|test)/**/*.test.js',
        '*.test.js',
        'test/**/test!(PackageFiles|Startup).js',
    ],
};
