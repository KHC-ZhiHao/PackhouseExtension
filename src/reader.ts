import * as ts from 'typescript'
import * as vscode from 'vscode'

import Config from './config'

function getSource(document: string): ts.SourceFile {
    return ts.createSourceFile('AST.ts', document, ts.ScriptTarget.ES2020)
}

function deepEachChild(nodes: Array<ts.Node>) {

}

export function handlerFile(config: Config, document: vscode.TextDocument, line: number): any {

}

export function packhouseFile(config: Config, document: vscode.TextDocument, line: number): any {
    let source = getSource(document.getText())
    let index = 0
    source.forEachChild((child) => {
        try {
            let line = source.getLineAndCharacterOfPosition(child.pos)
            console.log(index, ':', line)
            index += 1
        } catch (error) {
            console.log(error)
        }
    })
    // let inType: string | null = null 
    // let inWhere: string | null = null
    // let inCaller: string | null = null
    // while (line >= 0) {
    //     let text = document.lineAt(line).text.replace(/\s/g, '')
    //     if (inCaller == null) {

    //     }
    //     if (inWhere == null) {
    //         if (text.match(/install:|install\(/)) {
    //             inWhere = 'install'
    //         }
    //         if (text.match(/handler:|handler\(/)) {
    //             inWhere = 'handler'
    //         }
    //     }
    //     if (inType == null) {
    //         if (text.match(/tools:/)) {
    //             inType = 'tool'
    //         }
    //         if (text.match(/lines:/)) {
    //             inType = 'line'
    //         }
    //     }
    //     line -= 1
    //     if (inType) {
    //         break
    //     }
    // }
    // return {
    //     inType,
    //     inWhere
    // }
}
