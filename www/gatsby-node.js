const {createFilePath} = require(`gatsby-source-filesystem`);
const path = require('path');

exports.onCreateNode = ({node, getNode, actions}) => {
    const {createNodeField} = actions;
    if (node.internal.type === `MarkdownRemark`) {
        const slug = createFilePath({node, getNode});
        createNodeField({
            node,
            name: `slug`,
            value: slug
        });
    }
};

exports.createPages = async ({graphql, actions}) => {
    const {createPage} = actions;
    const result = await graphql(`
      {
        allMarkdownRemark {
          edges {
            node {
              fields {
                slug
              }
            }
          }
        }
      }
    `);
    if (result.errors) {
        throw new Error(result.errors.map(error => error.message).join('\n'));
    }
    result.data.allMarkdownRemark.edges.forEach(({node}) => {
        createPage({
            path: node.fields.slug,
            component: path.resolve(__dirname, `./src/templates/docs.js`),
            context: {
                // Data passed to context is available in page queries as GraphQL variables.
                slug: node.fields.slug
            }
        });
    });
};

// Retain the original Glamor css-prop transform without the deprecated Gatsby plugin.
exports.onCreateWebpackConfig = ({actions, plugins}) => {
    actions.setWebpackConfig({
        plugins: [plugins.provide({Glamor: 'glamor/react'})]
    });
};

exports.onCreateBabelConfig = ({actions}) => {
    actions.setBabelPlugin({name: require.resolve('glamor/babel-hoist')});
    actions.setBabelPreset({
        name: require.resolve('@babel/preset-react'),
        options: {runtime: 'classic', pragma: 'Glamor.createElement'}
    });
};
