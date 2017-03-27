"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
exports.DEFINE_MESSAGES_HOOK = 'defineMessages';
/**
 * Trim the trailing & beginning ': 'asd' -> asd
 *
 * @param {string} txt text
 * @returns trimmed string
 */
function trimSingleQuote(txt) {
    return txt.substr(1, txt.length - 2);
}
/**
 * Extract the object literal in TS AST into MessageDescriptor
 *
 * @param {ts.ObjectLiteralExpression} node object literal
 * @returns {Messages}
 */
function extractMessageDescriptor(node, idPrefix) {
    const msg = {
        id: '',
        description: '',
        defaultMessage: ''
    };
    // Go thru each property
    ts.forEachChild(node, (p) => {
        switch (p.name.getText()) {
            case 'id':
                const id = trimSingleQuote(p.initializer.getText());
                msg.id = idPrefix ? `${idPrefix}_${id}` : id;
                break;
            case 'description':
                msg.description = trimSingleQuote(p.initializer.getText());
                break;
            case 'defaultMessage':
                msg.defaultMessage = trimSingleQuote(p.initializer.getText());
                break;
        }
    });
    return msg;
}
function messagesVisitor(ctx, trans, opts) {
    const visitor = (node) => {
        if (node.kind !== ts.SyntaxKind.PropertyAssignment) {
            return ts.visitEachChild(node, visitor, ctx);
        }
        if (node.initializer.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
            return ts.visitEachChild(node, visitor, ctx);
        }
        const msg = extractMessageDescriptor(node.initializer, opts.idPrefix);
        trans[node.name.getText()] = msg;
        const newMsgNode = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression);
        // Convert translations to raw json object
        newMsgNode.properties = Object.keys(msg).map(k => {
            const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment);
            const key = ts.createNode(ts.SyntaxKind.Identifier);
            const value = ts.createNode(ts.SyntaxKind.StringLiteral);
            key.text = k;
            value.text = msg[k];
            obj.name = key;
            obj.initializer = value;
            return obj;
        });
        if (typeof opts.onMsgExtracted === 'function') {
            opts.onMsgExtracted(trans);
        }
        const newAssignment = ts.createNode(ts.SyntaxKind.PropertyAssignment);
        newAssignment.name = node.name;
        newAssignment.initializer = newMsgNode;
        return newAssignment;
    };
    return visitor;
}
function default_1(opts) {
    return (ctx) => {
        const visitor = (node) => {
            switch (node.kind) {
                case ts.SyntaxKind.CallExpression:
                    console.log(node.expression.getText());
                    if (node.expression.getText() === exports.DEFINE_MESSAGES_HOOK) {
                        const trans = {};
                        return ts.visitEachChild(node, messagesVisitor(ctx, trans, opts), ctx);
                    }
                // Fallthru
                default:
                    return ts.visitEachChild(node, visitor, ctx);
            }
        };
        return (sf) => ts.visitNode(sf, visitor);
    };
}
exports.default = default_1;
