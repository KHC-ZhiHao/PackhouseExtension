import loader from './loader_old'
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
    public position: vscode.Position | null = null
    public document: vscode.TextDocument | null = null
    public configPath: string

    constructor(configPath: any) {
        this.configPath = configPath
        this.data = {}
        this.init()
        this.update()
    }

    init() {
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
                    desc: ['#### packhouse tool', iGroup.tools[tool].info],
                    insert: `'${group}/${tool}'`
                })
            }
        }
    }

    isInGroupFile() {

    }

    isPackhouse() {

    }

    getCallMap(target: any) {
        let data = this.parseName(target.name)
        let group = this.data.groups
        if (data.sign) {
            if (this.data.mergers[data.sign] == null) {
                return null
            }
            group = this.data.mergers[data.sign].group
        }
        let mode = target.type === 'tool' ? group.tools : group.lines
        if (mode == null) {
            return null
        }
        let hander = mode[data.target]
        return hander
    }

    parseName(name: string) {
        let sign = name.match('@') ? name.split('@')[0] : ''
        let target = name.replace(sign + '@', '').split('/')
        return {
            sign,
            group: target[0],
            target: target[1]
        }
    }

    getToolDesc(method: string, tool: any, hasNoGood: boolean): any {
        let desc = ['```ts', `function ${method} (`]
        let insert = []
        let args = []
        for (let i = 0; i < tool.args.length; i++) {
            args.push(tool.args[i] + ':' + tool.request[i] || 'any')
            insert.push(tool.args[i])
        }
        if (method === 'action') {
            let response = `${tool.response || 'any'}`
            if (hasNoGood) {
                args.push(`callback: result: ${response} => void`)
                insert.push(`result => {}`)
            } else {
                args.push(`callback: (error, result: ${response}) => void`)
                insert.push(`(error, result) => {}`)
            }
            desc[1] += args.join(', ') + '): void'
        }
        if (method === 'promise') {
            desc[1] += args.join(', ') + '): Promise'
        }
        desc.push('```')
        return {
            desc: desc.join('\n'),
            insert: insert.join(', '),
            noCallback: insert.slice(0, -1).join(', ')
        }
    }

    exportInputKey(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.initContext(document, position)
        this.perfix('.tool(', () => this.add(this.tools))
        this.perfix(['.action(', '.promise('], () => {
            let target = loader(document.getText(), position.line)
            if (target) {
                let map = this.getCallMap(target)
                if (map) {
                    let items = [
                        {
                            key: 'params',
                            desc: [map.desc],
                            insert: map.insert
                        }
                    ]
                    if (target.method === 'action') {
                        items.push({
                            key: 'params-no-callback',
                            desc: [map.desc],
                            insert: map.noCallback
                        })
                    }
                    this.add(items)
                }
                
            }
        })
        return this.items
    }

    perfix(key: string | Array<string>, callback: () => void) {
        let position = this.position ? this.position.character : 0
        if (Array.isArray(key)) {
            for (let text of key) {
                if (this.lineText.slice(position - text.length, position) === text) {
                    callback()
                }
            }
        } else {
            if (this.lineText.slice(position - key.length, position) === key) {
                callback()
            }
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
}

export default Main
