import * as ts from 'typescript'
import { FormattedMessage, Messages } from 'react-intl'

export const DEFINE_MESSAGES_HOOK = 'defineMessages'

/**
 * Trim the trailing & beginning ': 'asd' -> asd
 *
 * @param {string} txt text
 * @returns trimmed string
 */
function trimSingleQuote(txt: string): string {
    return txt.substr(1, txt.length - 2)
}

/**
 * Extract the object literal in TS AST into MessageDescriptor
 *
 * @param {ts.ObjectLiteralExpression} node object literal
 * @returns {Messages}
 */
function extractMessageDescriptor(
    node: ts.ObjectLiteralExpression,
    idPrefix?: string
): FormattedMessage.MessageDescriptor {
    const msg: FormattedMessage.MessageDescriptor = {
        id: '',
        description: '',
        defaultMessage: '',
    }

    // Go thru each property
    ts.forEachChild(node, (p: ts.PropertyAssignment) => {
        switch ((p.name as ts.Identifier).getText()) {
            case 'id':
                const id = trimSingleQuote((p.initializer as ts.Identifier).getText())
                msg.id = idPrefix ? `${idPrefix}_${id}` : id
                break
            case 'description':
                msg.description = trimSingleQuote((p.initializer as ts.Identifier).getText())
                break
            case 'defaultMessage':
                msg.defaultMessage = trimSingleQuote((p.initializer as ts.Identifier).getText())
                break
        }
    })

    return msg
}

export type Extractor = (messages: Messages, filename?: string) => void

export interface Opts {
    idPrefix?: string
    /**
     * Don't transform, only extract
     *
     * @type {boolean}
     * @memberOf Opts
     */
    extractOnly?: boolean
    onMsgExtracted?: Extractor
}

function messagesVisitor(ctx: ts.TransformationContext, trans: Messages, opts: Opts, sf: ts.SourceFile) {
    const visitor = (node: ts.Node): ts.Node => {
        if (node.kind !== ts.SyntaxKind.PropertyAssignment) {
            return ts.visitEachChild(node, visitor, ctx)
        }

        if ((node as ts.PropertyAssignment).initializer.kind !== ts.SyntaxKind.ObjectLiteralExpression) {
            return ts.visitEachChild(node, visitor, ctx)
        }

        const msg = extractMessageDescriptor(
            (node as ts.PropertyAssignment).initializer as ts.ObjectLiteralExpression,
            opts.idPrefix
        )

        trans[((node as ts.PropertyAssignment).name as ts.Identifier).getText()] = msg

        if (typeof opts.onMsgExtracted === 'function') {
            opts.onMsgExtracted(trans, sf.fileName)
        }

        if (!opts.extractOnly) {
            // Convert translations to raw json object
            return ts.createPropertyAssignment(
                (node as ts.PropertyAssignment).name,
                ts.createObjectLiteral(
                    ts.createNodeArray(
                        Object.keys(msg).map((k: keyof FormattedMessage.MessageDescriptor) =>
                            ts.createPropertyAssignment(ts.createIdentifier(k), ts.createLiteral(msg[k]))
                        )
                    )
                )
            )
        }

        return ts.visitEachChild(node, visitor, ctx)
    }
    return visitor
}

export default function(opts: Opts) {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        function getVisitor(sf: ts.SourceFile) {
            const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
                switch (node.kind) {
                    case ts.SyntaxKind.CallExpression:
                        if (
                            ((node as ts.CallExpression).expression as ts.Identifier).getText(sf) ===
                            DEFINE_MESSAGES_HOOK
                        ) {
                            const trans = {}
                            return ts.visitEachChild(node, messagesVisitor(ctx, trans, opts, sf), ctx)
                        }
                        break
                }
                return ts.visitEachChild(node, visitor, ctx)
            }

            return visitor
        }

        return (sf: ts.SourceFile) => ts.visitNode(sf, getVisitor(sf))
    }
}
