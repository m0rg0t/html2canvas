// Framework support only; fixture iframes keep their own browser environment.
if (typeof console.assert !== 'function') {
    console.assert = function (condition, message) {
        if (!condition) {
            throw new Error(message || 'Legacy framework polyfill assertion failed');
        }
    };
}
