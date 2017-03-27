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

/**
 * Create simple obj { k: v }
 *
 * @param {string} k
 * @param {string} v
 * @returns {ts.PropertyAssignment}
 */
function createObjKeyValue (k: string, v: string): ts.PropertyAssignment {
    const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment) as ts.PropertyAssignment
    const key = ts.createNode(ts.SyntaxKind.Identifier) as ts.Identifier
    key.text = k

    const value = ts.createNode(ts.SyntaxKind.StringLiteral) as ts.StringLiteral
    value.text = v

    obj.name = key
    obj.initializer = value
    return obj
}

/**
 * Transform MessageDescriptor to ObjectLiteralExpression
 *
 * @param {MessageDescriptor} msg
 * @param {string} [idPrefix]
 * @returns {ts.ObjectLiteralExpression}
 */
function createIntlMessage (msg: FormattedMessage.MessageDescriptor): ts.ObjectLiteralExpression {
    const node = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression) as ts.ObjectLiteralExpression
    const properties = [
        createObjKeyValue('id', msg.id),
        createObjKeyValue('description', msg.description),
        createObjKeyValue('defaultMessage', msg.defaultMessage)
    ] as ts.NodeArray<ts.ObjectLiteralElementLike>
    node.properties = properties
    return node
}

export type Extractor = (messages: Messages) => void

export interface Opts {
    idPrefix?: string
    onMsgExtracted?: Extractor
}

export default function (opts: Opts) {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
            switch (node.kind) {
                case ts.SyntaxKind.CallExpression:
                    if ((node as ts.CallExpression).expression.getText() === DEFINE_MESSAGES_HOOK) {
                        const trans = {}
                        ts.forEachChild((node as ts.CallExpression).arguments[0], (node: ts.PropertyAssignment) => {
                            if (node.kind !== ts.SyntaxKind.PropertyAssignment) {
                                return
                            }
                            trans[node.name.getText()] = extractMessageDescriptor(node.initializer as ts.ObjectLiteralExpression, opts.idPrefix)
                        })

                        const newNode = ts.createNode(ts.SyntaxKind.ObjectLiteralExpression) as ts.ObjectLiteralExpression

                        // Convert translations to raw json object
                        newNode.properties = Object.keys(trans).map(k => {
                            const obj = ts.createNode(ts.SyntaxKind.PropertyAssignment) as ts.PropertyAssignment
                            const key = ts.createNode(ts.SyntaxKind.Identifier) as ts.Identifier
                            key.text = k
                            obj.name = key
                            obj.initializer = createIntlMessage(trans[k])
                            return obj
                        }) as ts.NodeArray<ts.ObjectLiteralElementLike>

                        if (typeof opts.onMsgExtracted === 'function') {
                            opts.onMsgExtracted(trans)
                        }
                        return newNode
                    }
                    // Fallthru
                default:
                    return ts.visitEachChild(node, visitor, ctx)
            }
        }

        return (sf: ts.SourceFile) => ts.visitNode(sf, visitor)
    }
}