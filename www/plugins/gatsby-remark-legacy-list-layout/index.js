// The original Markdown renderer retained paragraphs in list items that contain
// multiple blocks. Modern mdast unwraps them when a whole list is "tight".
// Preserve those existing block boundaries without editing content or CSS.
module.exports = ({markdownAST, compiler}) => {
    function visit(node) {
        if (!node.children) return;
        for (const child of node.children) visit(child);
        if (node.type === 'listItem' && node.children.length > 1) {
            node.children = node.children.map(child => child.type === 'paragraph'
                ? {type: 'html', value: compiler.generateHTML({type: 'root', children: [child]})}
                : child);
        }
    }
    visit(markdownAST);
};
