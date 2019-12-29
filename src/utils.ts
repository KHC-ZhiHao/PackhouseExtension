import * as vscode from 'vscode'

interface completionItem {
    key: string,
    kind: any,
    insert: string,
    desc: Array<string>
}

export default {
    parseTool() {
        
    },
    parseLine(lineText: string, targetInput: Array<string>, callback: any) {
        for (let input of targetInput) {
            if (lineText.slice(-(input.length)) === input) {
                callback()
                break
            }
        }
    },
    getNormalAutoCompletionItem({ key, insert, desc, kind }: completionItem): vscode.CompletionItem {
        let completionItem = new vscode.CompletionItem(key, kind || vscode.CompletionItemKind.Enum)
        completionItem.insertText = insert
        completionItem.sortText = '0'
        completionItem.documentation = new vscode.MarkdownString(desc.join('\n'))
        return completionItem
    }
}
