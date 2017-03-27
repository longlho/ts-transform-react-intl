import * as ts from 'typescript'
import { FormattedMessage, Messages } from 'react-intl'

export const DEFINE_MESSAGES_HOOK = 'defineMessages'

/**
 * Trim the trailing & beginning ': 'asd' -> asd
 *
 * @param {string} txt text
 * @returns trimmed string
 */
function trimSingleQuote (txt: string): string {
    return txt.substr(1, txt.length - 2)
}

/**
 * Extract the object literal in TS AST into MessageDescriptor
 *
 * @param {ts.ObjectLiteralExpression} node object literal
 * @returns {Messages}
 */
function extractMessageDescriptor (node: ts.ObjectLiteralExpression, idPrefix?: string): FormattedMessage.MessageDescriptor {
    const msg: FormattedMessage.MessageDescriptor = {
        id: '',
        description: '',
        defaultMessage: ''
    }

    // Go thru each property
    ts.forEachChild(node, (p: ts.PropertyAssignment) => {
        switch (p.name.getText()) {
        case 'id':
            const id = trimSingleQuote(p.initializer.getText())
            msg.id = idPrefix ? `${idPrefix}_${id}` : id
            break
        case 'description':
            msg.description = trimSingleQuote(p.initializer.getText())
            break
        case 'defaultMessage':
            msg.defaultMessage = trimSingleQuote(p.initializer.getText())
            break
        }
    })

    return msg
}

export type Extractor = (messages: Messages) => void

export interface Opts {
    idPrefix?: string
    onMsgExtracted?: Extractor
}

function messagesVisitor (ctx: ts.TransformationContext, trans: {}, opts: Opts) {
    const visitor = (node: ts.Node): ts.Node => {
        if (node.kind !== ts.SyntaxKind.PropertyAssignment) {
            return ts.visitEachChild(node, visitor, ctx)
        }

        if ((node as ts.PropertyAssignment).initializer.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
            return ts.visitEachChild(node, visitor, ctx)
        }

        const msg = extractMessageDescriptor((node as ts.PropertyAssignment).initializer as ts.ObjectLiteralExpression, opts.idPrefix)

        trans[(node as ts.PropertyAssignment).name.getText()] = msg

        const newMsgNode = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression) as ts.ObjectLiteralExpression

        // Convert translations to raw json object
        newMsgNode.properties = Object.keys(msg).map(k => {
            const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment) as ts.PropertyAssignment
            const key = ts.createNode(ts.SyntaxKind.Identifier) as ts.Identifier
            const value = ts.createNode(ts.SyntaxKind.StringLiteral) as ts.StringLiteral
            key.text = k
            value.text = msg[k]
            obj.name = key
            obj.initializer = value
            return obj
        }) as ts.NodeArray<ts.ObjectLiteralElementLike>

        if (typeof opts.onMsgExtracted === 'function') {
            opts.onMsgExtracted(trans)
        }

        const newAssignment = ts.createNode(ts.SyntaxKind.PropertyAssignment) as ts.PropertyAssignment
        newAssignment.name = (node as ts.PropertyAssignment).name
        newAssignment.initializer = newMsgNode

        return newAssignment
    }
    return visitor
}

export default function (opts: Opts) {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
            switch (node.kind) {
                case ts.SyntaxKind.CallExpression:
                    if ((node as ts.CallExpression).expression.getText() === DEFINE_MESSAGES_HOOK) {
                        const trans = {}
                        return ts.visitEachChild(
                            node,
                            messagesVisitor(ctx, trans, opts),
                            ctx
                        )
                    }
                    // Fallthru
                default:
                    return ts.visitEachChild(node, visitor, ctx)
            }
        }

        return (sf: ts.SourceFile) => ts.visitNode(sf, visitor)
    }
}