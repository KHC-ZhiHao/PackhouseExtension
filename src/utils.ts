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
    completionItem.insertText = new vscode.SnippetString(insert)
    completionItem.sortText = '0'
    completionItem.documentation = new vscode.MarkdownString(desc ? desc.join('\n\n') : 'packhouse')
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
    let target = name.match('/') ? name.replace(sign + '@', '').split('/') : ['', name]
    return {
        sign,
        group: target[0],
        target: target[1]
    }
}

export function clearArgs(text: string) {
    let used: Array<string> = []
    let count: number = 0
    let index: number = 0
    let result: string = ''
    let inString: any = false
    for (let i = text.length; i >= 0; i--) {
        let char = text[i]
        if (char === `"` || char === `'` || char === '`') {
            if (inString) {
                if (inString === char && text[i - 1] !== '\\') {
                    inString = false
                }
            } else {
                inString = char
            }
        }
        if (char === '(') {
            if (inString === false) {
                count -= 1
            }
        }
        if (count !== 0) {
            if (used[index] == null) {
                used[index] = ''
            }
            used[index] = char + used[index]
        }
        if (count === 0 && char != null) {
            result = char + result
        }
        if (char === ')' && count === 0) {
            index += 1
        }
        if (char === ')') {
            if (inString === false) {
                count += 1
            }
        }
    }
    return {
        used: used.slice(1).reverse(),
        text: result
    }
}

export function getInsert(args: Array<string>, request: Array<string>) {
    let output = []
    for (let i = 0; i < args.length; i++) {
        let isRequire = (request[i] || '').match(/\?/) ? '?' : ''
        output.push(args[i] + isRequire)
    }
    return output.join(', ')
}

export function getArgsDoc(args: Array<string>, request: Array<string>): string {
    let output = []
    for (let i = 0; i < args.length; i++) {
        output.push(args[i] + ': ' + request[i] || 'any')
    }
    return [
        '```ts',
        output.join(', '),
        '```'
    ].join('\n')
}
