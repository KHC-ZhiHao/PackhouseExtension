import * as vscode from 'vscode'

export function checkInPackhouse() {
    let document = vscode.window.activeTextEditor?.document.getText()
    if (document == null) {
        return false
    }
    return !!document.match('include') &&  !!document.match('install') &&  !!document.match('handler')
}

export function getCompletionItem(key: string, insert: string, desc?: Array<string>): vscode.CompletionItem {
    let completionItem = new vscode.CompletionItem(key, vscode.CompletionItemKind.Enum)
    completionItem.insertText = insert
    completionItem.sortText = '0'
    completionItem.documentation = new vscode.MarkdownString(desc ? desc.join('\n') : 'packhouse')
    return completionItem
}

export function checkPerfix(text: string, char: number = 0, keys: Array<string>): Boolean {
    for (let key of keys) {
        return text.slice(char - key.length, char) === key
    }
    return false
}

export function parseName(name: string) {
    let sign = name.match('@') ? name.split('@')[0] : ''
    let target = name.replace(sign + '@', '').split('/')
    return {
        sign,
        group: target[0],
        target: target[1]
    }
}
