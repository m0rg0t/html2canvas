const React = require('react');
const {renderToString} = require('react-dom/server');
const {renderStaticOptimized} = require('glamor/server');

// Keep the original optimized styles and IDs so client hydration uses the same rules.
exports.replaceRenderer = ({bodyComponent, replaceBodyHTMLString, setHeadComponents}) => {
    const {html, css, ids} = renderStaticOptimized(() => renderToString(bodyComponent));
    replaceBodyHTMLString(html);
    setHeadComponents([
        React.createElement('style', {
            id: 'glamor-styles',
            key: 'glamor-styles',
            dangerouslySetInnerHTML: {__html: css}
        }),
        React.createElement('script', {
            id: 'glamor-ids',
            key: 'glamor-ids',
            dangerouslySetInnerHTML: {
                __html: `\n        // <![CDATA[\n        window._glamor = ${JSON.stringify(ids)}\n        // ]]>\n        `
            }
        })
    ]);
};
