const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {resolve} = require('node:path');
const {test} = require('node:test');
const siteRequire = createRequire(resolve('www/package.json'));
const hooks = require('../www/gatsby-node.js');

test('Gatsby page creation preserves slugs and propagates GraphQL errors', async () => {
    const pages = [];
    await hooks.createPages({
        graphql: async () => ({data: {allMarkdownRemark: {edges: [
            {node: {fields: {slug: '/documentation/'}}},
            {node: {fields: {slug: '/features/'}}}
        ]}}}),
        actions: {createPage: page => pages.push(page)}
    });
    assert.deepEqual(pages.map(page => [page.path, page.context.slug]), [
        ['/documentation/', '/documentation/'], ['/features/', '/features/']
    ]);
    for (const page of pages) assert.equal(page.component, resolve('www/src/templates/docs.js'));
    await assert.rejects(hooks.createPages({
        graphql: async () => ({errors: [{message: 'synthetic query failure'}]}),
        actions: {createPage: () => assert.fail('A failed query must not create pages')}
    }), /synthetic query failure/);
});

test('Glamor SSR produces the original CSS and hydration markers', () => {
    const React = siteRequire('react');
    const Glamor = siteRequire('glamor/react');
    const {renderToString} = siteRequire('react-dom/server');
    const {renderStaticOptimized} = siteRequire('glamor/server');
    const bodyComponent = React.createElement(() => Glamor.createElement('section', {
        css: {color: '#123456', padding: '12px', '@media(min-width: 1000px)': {padding: '24px'}}
    }, 'Synthetic style fixture'));
    const expected = renderStaticOptimized(() => renderToString(bodyComponent));
    let html;
    let head;
    require('../www/gatsby-ssr.js').replaceRenderer({
        bodyComponent,
        replaceBodyHTMLString: value => { html = value; },
        setHeadComponents: value => { head = value; }
    });
    assert.equal(html, expected.html);
    assert.equal(head[0].props.id, 'glamor-styles');
    assert.equal(head[0].props.dangerouslySetInnerHTML.__html, expected.css);
    assert.ok(expected.css.includes('@media'));
    assert.equal(head[1].props.id, 'glamor-ids');
    assert.ok(head[1].props.dangerouslySetInnerHTML.__html.includes(JSON.stringify(expected.ids)));
});
