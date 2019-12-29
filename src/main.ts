import utils from './utils'
import * as vscode from 'vscode'

interface Item {
    key: string
    kind?: any
    desc?: Array<string>
    insert: string
}

class Main {

    public data: any = {}
    public tools: Array<Item> = []
    public items: Array<vscode.CompletionItem> = []
    public lineText: string = ''
    public configPath: string

    constructor(configPath: any) {
        this.configPath = configPath
        this.init()
        this.update()
    }

    init() {
        this.data = {}
        this.items = []
        this.lineText = ''
    }

    update() {
        this.init()
        this.data = require(this.configPath)
        this.tools = []
        for (let group in this.data.groups) {
            let iGroup = this.data.groups[group] || {}
            for (let tool in iGroup.tools) {
                this.tools.push({
                    key: `${group}/${tool}`,
                    insert: `'${group}/${tool}'`
                })
            }
        }
    }

    isInGroupFile() {

    }

    isPackhouse() {

    }

    getCallTarget() {
        return {
            name: '',
            type: 'tool',
            method: 'action'
        }
    }

    isNoGood() {

    }

    inputKey(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.init()
        this.lineText = document.lineAt(position.line).text
        this.perfix('.tool()', () => this.add(this.tools))
        this.perfix('.action()', () => this.add(this.tools))
        this.perfix('.promise()', () => this.add(this.tools))
        return this.items
    }

    perfix(key: string, callback: () => void) {
        if (this.lineText.slice(-(key.length)) === key) {
            callback()
        }
    }

    add(items: Array<Item>) {
        for (let item of items) {
            let completionItem = new vscode.CompletionItem(item.key, item.kind || vscode.CompletionItemKind.Enum)
            completionItem.insertText = item.insert
            completionItem.sortText = '0'
            completionItem.documentation = new vscode.MarkdownString(item.desc ? item.desc.join('\n') : 'packhouse')
            this.items.push(completionItem)
        }
    }

    hover() {

    }
}

export default Main
