const {rehydrate} = require('glamor');

exports.onClientEntry = () => {
    if (window._glamor) {
        rehydrate(window._glamor);
    }
};
