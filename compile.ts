import * as ts from 'typescript'
import { sync as globSync } from 'glob'
import { resolve } from 'path'
import { transform as intlTransformer, aggregate } from './src'

declare module 'fs-extra' {
    export function outputJsonSync(file: string, data: any, opts?: {}): void;
}
const { name: pkgName } = require(resolve(__dirname, 'package.json'))

const CJS_CONFIG = {
    experimentalDecorators: true,
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noEmitOnError: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    stripInternal: true,
    target: ts.ScriptTarget.ES2015
}

export default function compile (input: string, options: ts.CompilerOptions = CJS_CONFIG) {
    const files = globSync(input)
    const compilerHost = ts.createCompilerHost(options)
    const program = ts.createProgram(files, options, compilerHost)

    const msgs = {}

    let emitResult = program.emit(undefined, undefined, undefined, undefined, {
        before: [
            intlTransformer({
                idPrefix: pkgName,
                onMsgExtracted: aggregate(msgs)
            })
        ]
    })

    let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

    allDiagnostics.forEach(diagnostic => {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    })

    return msgs
}