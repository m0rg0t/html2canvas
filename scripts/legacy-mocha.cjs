const {transformSync} = require('@babel/core');

function transformMocha(content, filename) {
    return transformSync(content, {
        filename,
        babelrc: false,
        configFile: false,
        sourceType: 'script',
        // Loose class lowering avoids Reflect.construct(newTarget), which the
        // legacy framework polyfill cannot implement in IE9. Test bodies and
        // fixture renderer bundles are never transformed by this adapter.
        presets: [[require.resolve('@babel/preset-env'), {targets: {ie: '9'}, modules: false, loose: true}]],
        sourceMaps: 'inline'
    }).code;
}

function createPreprocessor() {
    return (content, file, done) => {
        try {
            done(null, transformMocha(content, file.originalPath));
        } catch (error) {
            done(error);
        }
    };
}

module.exports = {transformMocha, createPreprocessor};
