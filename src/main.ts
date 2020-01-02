import * as fs from 'fs'
import * as vscode from 'vscode'
import * as utils from './utils'

import Config from './config'
import Reader from './reader'

interface registerItem {
    prefix: Array<string>
    callback: (perfix: Array<string>, document: vscode.TextDocument, position: vscode.Position) => void
}

function getToolHandler(method: string, tool: any, hasNoGood: boolean, pack: number = 0): any {
    let desc = ['```ts', `function ${method} (`]
    let insert = []
    let args = []
    for (let i = pack; i < tool.args.length; i++) {
        let isRequire = (tool.request[i] || '').match(/\?/) ? '?' : ''
        args.push(tool.args[i] + ': ' + tool.request[i] || 'any')
        insert.push(tool.args[i] + isRequire)
    }
    if (method === 'action') {
        let response = `${tool.response || 'any'}`
        if (hasNoGood) {
            args.push(`callback: result: ${response} => void`)
            insert.push(`result => {$0}`)
        } else {
            args.push(`callback: (error, result: ${response}) => void`)
            insert.push(`(error, result) => {$0}`)
        }
        desc[1] += args.join(', ') + '): void'
    }
    if (method === 'promise') {
        desc[1] += args.join(', ') + '): Promise'
    }
    if (method === 'line') {
        desc[1] += args.join(', ') + '): Line'
    }
    desc.push('```')
    return {
        desc: desc.join('\n'),
        insert: insert.join(', '),
        noCallback: insert.slice(0, -1).join(', ')
    }
}
class Main {
    public items: Array<vscode.CompletionItem> = []
    public group: any = null
    public readed: any = {}
    public config: Config = new Config({})
    public filePath: string | undefined = undefined
    public configPath: string = ''
    public registerItems: Array<registerItem> = []
    public inPackhouseFile: boolean = false
    constructor(configPath: any) {
        this.configPath = configPath
        this.handler()
        this.install()
        this.updatePage()
        fs.watchFile(this.configPath, () => this.install())
    }

    install() {
        let data = {}
        try {
            data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
        } catch (error) {}
        this.config = new Config(data)
    }

    updatePage() {
        try {
            this.filePath = vscode.window.activeTextEditor?.document.uri.fsPath
            this.group = this.config.getGroupByPath(this.filePath || '')
            this.inPackhouseFile = !!this.group
        } catch (error) {}
    }

    keyIn(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.items = []
        this.readed = new Reader(document.getText(), position.line)
        let lineText = document.lineAt(position.line).text
        let charPosition = position.character
        for (let item of this.registerItems) {
            if (utils.checkPerfix(lineText, charPosition, item.prefix)) {
                item.callback(item.prefix, document, position)
            }
        }
        return this.items
    }

    register(prefix: Array<string>, callback: (perfix: Array<string>, document: vscode.TextDocument, position: vscode.Position) => void) {
        this.registerItems.push({
            prefix,
            callback
        })
    }

    addToolItem(tool: any, method: string, hasNoGood: boolean, pack: number = 0) {
        try {
            let handler = getToolHandler(method, tool, hasNoGood, pack)
            this.items.push(utils.getCompletionItem('params', handler.insert, [
                'packhouse tool',
                handler.desc
            ]))
            if (method === 'action') {
                this.items.push(utils.getCompletionItem('params-no-callback', handler.noCallback, [
                    'packhouse tool',
                    handler.desc
                ]))
            }
        } catch (error) {
            console.log(error)
        }
    }

    addItem(name: string, insert: string, docs: Array<string> = []) {
        this.items.push(utils.getCompletionItem(name, insert, ['packhouse extension:'].concat(docs)))
    }

    handler() {
        this.register(['.'], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null) {
                return null
            }
            if (data.type === 'line' && data.method == null) {
                let name = utils.parseName(data.name)
                let line = this.config.getLine(name.group, name.target, name.sign)
                for (let tool in line.layout) {
                    let handler = getToolHandler('line', line.layout[tool], false)
                    this.addItem(tool, `${tool}(${handler.insert})`, [handler.desc])
                }
            }
        })
        this.register([')('], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null || data.type !== 'line') {
                return null
            }
            if (this.inPackhouseFile === false) {
                if (data.method == null) {
                    let name = utils.parseName(data.name)
                    let line = this.config.getLine(name.group, name.target, name.sign)
                    let handler = getToolHandler('line', line, false)
                    this.addItem('params', `${handler.insert}`, [handler.desc])
                }
            }
            let type = this.readed.getType()
            if (type == null) {
                return null
            }
            let action = this.readed.getAction()
            let user = this.readed.getUser()
            if (user == null) {
                return null
            }
            let mergers = this.group.data.mergers || {}
            if (type === 'tool' && action === 'handler') {
                let included = this.group?.data?.tools[user]?.included || {}
                let packLength = this.group?.data?.tools[user]?.packLength[data?.name] || {}
                if (included[data?.name]) {
                    let target = utils.parseName(included[data?.name].used)
                    let merger = utils.parseName(mergers[target.group])
                    let line = this.config.getLine(target.group, target.target, merger.sign)
                    if (line) {
                        this.addToolItem(line, data.method, data.hasNoGood, packLength)
                    }
                }
            }
            if ((action === 'handler' || action === 'input' || action === 'output') && type === 'line') {
                try {
                    let included = this.group?.data?.lines[user]?.included || {}
                    let packLength = 0 // this.group?.data?.lines[user]?.packLength[data?.name] || {}
                    if (included[data?.name]) {
                        let target = utils.parseName(included[data?.name].used)
                        let merger = utils.parseName(mergers[target.group])
                        let line = this.config.getLine(target.group, target.target, merger.sign)
                        if (line) {
                            this.addToolItem(line, data.method, data.hasNoGood, packLength)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            }
        })
        this.register(['.line('], (prefix, document, position) => {
            if (this.inPackhouseFile === false) {
                let lines = this.config.getAllLines()
                for (let line of lines) {
                    this.addItem(line.name, `'${line.name}'`, [line.info])
                }
                return null
            }
            let type = this.readed.getType()
            if (type == null) {
                return null
            }
            let action = this.readed.getAction()
            if (action === 'install') {
                let lines = this.group.data.lines || {}
                let mergers = this.group.data.mergers || {}
                for (let line in lines) {
                    let target = lines[line]
                    this.addItem(line, `'${line}'`, [utils.getArgsDoc(target.args, target.request)])
                }
                for (let merger in mergers) {
                    let data = utils.parseName(mergers[merger])
                    let group = this.config.getGroup(data.group, data.sign)
                    for (let line in group.lines) {
                        let target = group.lines[line]
                        this.addItem(`${merger}/${line}`, `'${merger}/${line}'`, [utils.getArgsDoc(target.args, target.request)])
                    }
                }
            }
            if (type === 'tool' && action === 'handler') {
                let user = this.readed.getUser()
                if (user) {
                    let included = this.group?.data.tools[user]?.included || {}
                    for (let include in included) {
                        let target = included[include]
                        if (target.type === 'line') {
                            this.addItem(include, `'${include}'`)
                        }
                    }
                }
            }
            if (type === 'line' && (action === 'handler' || action === 'input' || action === 'output')) {
                let user = this.readed.getUser()
                if (user) {
                    let included = this.group?.data.lines[user]?.included || {}
                    for (let include in included) {
                        let target = included[include]
                        if (target.type === 'line') {
                            this.addItem(include, `'${include}'`, [`${include} : ${target.used}`])
                        }
                    }
                }
            }
        })
        this.register(['.tool('], () => {
            if (this.inPackhouseFile === false) {
                let tools = this.config.getAllTools()
                for (let tool of tools) {
                    this.addItem(tool.name, `'${tool.name}'`, [tool.info])
                }
                return null
            }
            let type = this.readed.getType()
            if (type == null) {
                return null
            }
            let action = this.readed.getAction()
            if (action === 'install') {
                let tools = this.group.data.tools || {}
                let mergers = this.group.data.mergers || {}
                for (let tool in tools) {
                    this.addItem(tool, `'${tool}'`)
                }
                for (let merger in mergers) {
                    let data = utils.parseName(mergers[merger])
                    let group = this.config.getGroup(data.group, data.sign)
                    for (let tool in group.tools) {
                        this.addItem(`${merger}/${tool}`, `'${merger}/${tool}'`, [`${merger} : ${mergers[merger]}`])
                    }
                }
            }
            if (action === 'handler' && type === 'tool') {
                let user = this.readed.getUser()
                if (user) {
                    let included = this.group?.data.tools[user]?.included || {}
                    for (let include in included) {
                        let target = included[include]
                        if (target.type === 'tool') {
                            this.addItem(include, `'${include}'`, [`${include} : ${target.used}`])
                        }
                    }
                }
            }
            if ((action === 'handler' || action === 'input' || action === 'output') && type === 'line') {
                let user = this.readed.getUser()
                if (user) {
                    let included = this.group?.data.lines[user]?.included || {}
                    for (let include in included) {
                        let target = included[include]
                        if (target.type === 'tool') {
                            this.addItem(include, `'${include}'`, [`${include} : ${target.used}`])
                        }
                    }
                }
            }
        })
        this.register(['.action(', '.promise('], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null) {
                return null
            }
            let action = this.readed.getAction()
            if (data.type === 'line' && data.method === 'action') {
                this.addItem('callback', `(error, result) => {$0}`)
                if (this.inPackhouseFile && action === 'handler') {
                    this.addItem('access', `self.access($0)`, [])
                }
            }
            if (this.inPackhouseFile === false) {
                if (data.type === 'tool') {
                    let name = utils.parseName(data.name)
                    let tool = this.config.getTool(name.group, name.target, name.sign)
                    if (tool) {
                        this.addToolItem(tool, data.method, data.hasNoGood)
                    }
                }
                return null
            }
            let type = this.readed.getType()
            let mergers = this.group.data.mergers || {}
            if (type) {
                if (action === 'handler' && type === 'tool') {
                    let user = this.readed.getUser()
                    if (user) {
                        let included = this.group?.data.tools[user]?.included || {}
                        let packLength = this.group?.data.tools[user]?.packLength[data?.name] || {}
                        if (data?.type === 'tool' && included[data?.name]) {
                            let target = utils.parseName(included[data?.name].used)
                            let merger = utils.parseName(mergers[target.group])
                            let tool = this.config.getTool(target.group, target.target, merger.sign)
                            if (tool) {
                                this.addToolItem(tool, data.method, data.hasNoGood, packLength)
                            }
                        }
                    }
                }
            }
        })
        this.register(['.noGood('], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null || data?.type !== 'tool') {
                return null
            }
            this.addItem('NoGoodError', 'self.error')
            this.addItem('NoGoodResponse', 'e => self.response(e, 500)')
        })
        this.register(['.always('], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null || data?.type !== 'tool') {
                return null
            }
            this.addItem('AlwaysNext', 'next', ['packhouse always next'])
        })
    }
}

export default Main
