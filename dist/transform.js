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
    let id;
    // Go thru each property
    ts.forEachChild(node, (p) => {
        switch (p.name.getText()) {
            case 'id':
                id = trimSingleQuote(p.initializer.getText());
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
    if (!id) {
        return {};
    }
    return {
        [id]: msg
    };
}
/**
 * Create simple obj { k: v }
 *
 * @param {string} k
 * @param {string} v
 * @returns {ts.PropertyAssignment}
 */
function createObjKeyValue(k, v) {
    const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment);
    const key = ts.createNode(ts.SyntaxKind.Identifier);
    key.text = k;
    const value = ts.createNode(ts.SyntaxKind.StringLiteral);
    value.text = v;
    obj.name = key;
    obj.initializer = value;
    return obj;
}
/**
 * Transform MessageDescriptor to ObjectLiteralExpression
 *
 * @param {MessageDescriptor} msg
 * @param {string} [idPrefix]
 * @returns {ts.ObjectLiteralExpression}
 */
function createIntlMessage(msg) {
    const node = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression);
    const properties = [
        createObjKeyValue('id', msg.id),
        createObjKeyValue('description', msg.description),
        createObjKeyValue('defaultMessage', msg.defaultMessage)
    ];
    node.properties = properties;
    return node;
}
function default_1(opts) {
    return (ctx) => {
        const visitor = (node) => {
            switch (node.kind) {
                case ts.SyntaxKind.CallExpression:
                    if (node.expression.getText() === exports.DEFINE_MESSAGES_HOOK) {
                        const trans = {};
                        ts.forEachChild(node.arguments[0], (node) => {
                            if (node.kind !== ts.SyntaxKind.PropertyAssignment) {
                                return;
                            }
                            Object.assign(trans, extractMessageDescriptor(node.initializer, opts.idPrefix));
                        });
                        const newNode = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression);
                        // Convert translations to raw json object
                        newNode.properties = Object.keys(trans).map(k => {
                            const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment);
                            const key = ts.createNode(ts.SyntaxKind.Identifier);
                            key.text = k;
                            obj.name = key;
                            obj.initializer = createIntlMessage(trans[k]);
                            return obj;
                        });
                        if (typeof opts.onMsgExtracted === 'function') {
                            opts.onMsgExtracted(trans);
                        }
                        return newNode;
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
