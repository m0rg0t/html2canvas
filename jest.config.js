module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['src'],
    snapshotFormat: {escapeString: true, printBasicPrototype: true}
};
