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
    public help: vscode.SignatureHelp | null = null
    public tools: Array<Item> = []
    public items: Array<vscode.CompletionItem> = []
    public lineText: string = ''
    public position: vscode.Position | null = null
    public document: vscode.TextDocument | null = null
    public configPath: string

    constructor(configPath: any) {
        this.configPath = configPath
        this.init()
        this.update()
    }

    init() {
        this.data = {}
        this.help = null
        this.items = []
        this.lineText = ''
    }

    initContext(document: vscode.TextDocument, position: vscode.Position) {
        this.init()
        this.document = document
        this.lineText = document.lineAt(position.line).text
        this.position = position
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
            name: 'aws@dynanodb/get',
            pack: [],
            type: 'tool',
            method: 'action',
            hasNoGood: false,
            hasAlways: false
        }
    }

    exportHelp(document: vscode.TextDocument, position: vscode.Position): vscode.SignatureHelp | null {
        this.initContext(document, position)
        this.help = null
        this.perfix('.action()', () => {
            this.setHelp('action', `# ouo`)
        })
        return this.help
    }

    exportInputKey(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.initContext(document, position)
        this.perfix('.tool()', () => this.add(this.tools))
        return this.items
    }

    perfix(key: string, callback: () => void) {
        let position = this.position ? this.position.character : 0
        if (this.lineText.slice(position - key.length, position) === key) {
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

    setHelp(label: string, documentation?: string) {
        this.help = new vscode.SignatureHelp()
        this.help.signatures = [new vscode.SignatureInformation(label, new vscode.MarkdownString(documentation))]
    }
}

export default Main
