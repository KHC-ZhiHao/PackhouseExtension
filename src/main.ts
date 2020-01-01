import * as fs from 'fs'
import * as vscode from 'vscode'

import * as utils from './utils'

import loader from './loader'
import Config from './config'
import { GroupFile } from './reader'

interface registerItem {
    prefix: Array<string>
    callback: (perfix: Array<string>, document: vscode.TextDocument, position: vscode.Position) => void
}

function getLineDoc(args: Array<string>, request: Array<string>): string {
    let output = []
    for (let i = 0; i < args.length; i++) {
        output.push(args[i] + ': ' + request[i] || 'any')
    }
    return '```ts\n' + output.join(', ') + '\n```'
}

function getLineArgs(args: Array<string>, request: Array<string>) {
    let output = []
    for (let i = 0; i < args.length; i++) {
        let isRequire = (request[i] || '').match(/\?/) ? '?' : ''
        output.push(args[i] + isRequire)
    }
    return output.join(', ')
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
    public files: Array<string> = []
    public readed: any = {}
    public caller: any = null
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
            console.log(this.group)
        } catch (error) {
            console.log(error)
        }
    }

    keyIn(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.items = []
        this.readed = null
        if (this.inPackhouseFile) {
            this.readed = new GroupFile(document.getText(), position.line)
        }
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

    handler() {
        this.register(['.'], (prefix, document, position) => {
            let data = loader(document.getText(), position.line)
            if (data?.type === 'line') {
                let target = utils.parseName(data.name)
                let line = this.config.getLine(target.group, target.target, target.sign)
                for (let tool in line.layout) {
                    let handler = getToolHandler('line', line.layout[tool], false)
                    this.items.push(utils.getCompletionItem(tool, `${tool}(${handler.insert})`, [
                        'packhouse tool',
                        handler.desc
                    ]))
                }
            }
        })
        this.register([')('], (prefix, document, position) => {})
        this.register(['.line('], (prefix, document, position) => {
            if (this.inPackhouseFile) {
                let type = this.readed.getType()
                if (type) {
                    let action = this.readed.getAction()
                    if (action === 'install') {
                        let lines = this.group.data.lines || {}
                        let mergers = this.group.data.mergers || {}
                        for (let line in lines) {
                            this.items.push(utils.getCompletionItem(line, `'${line}'`, [
                                'packhouse self line',
                                `${line}`,
                                getLineDoc(lines[line].args, lines[line].request)
                            ]))
                        }
                        for (let merger in mergers) {
                            let data = utils.parseName(mergers[merger])
                            let group = this.config.getGroup(data.group, data.sign)
                            for (let line in group.lines) {
                                this.items.push(utils.getCompletionItem(`${merger}/${line}`, `'${merger}/${line}'`, [
                                    'packhouse merger',
                                    `${merger} : ${mergers[merger]}`,
                                ]))
                            }
                        }
                    }
                    if (action === 'handler' && type === 'line') {
                        let user = this.readed.getUser()
                        if (user) {
                            let included = this.group?.data.lines[user]?.included || {}
                            for (let include in included) {
                                let target = included[include]
                                if (target.type === 'line') {
                                    this.items.push(utils.getCompletionItem(include, `'${include}'`, [
                                        'packhouse include',
                                        `${include} : ${target.used}`
                                    ]))
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
                                if (target.type === 'line') {
                                    this.items.push(utils.getCompletionItem(include, `'${include}'`, [
                                        'packhouse include',
                                        `${include} : ${target.used}`
                                    ]))
                                }
                            }
                        }
                    }
                }
            } else {
                let lines = this.config.getAllLines()
                for (let line of lines) {
                    this.items.push(utils.getCompletionItem(line.name, `'${line.name}'`, [
                        'packhouse tool',
                        line.info,
                        getLineDoc(line.args, line.request)
                    ]))
                }
            }
        })
        this.register(['.tool('], () => {
            if (this.inPackhouseFile) {
                let type = this.readed.getType()
                if (type) {
                    let action = this.readed.getAction()
                    if (action === 'install') {
                        let tools = this.group.data.tools || {}
                        let mergers = this.group.data.mergers || {}
                        for (let tool in tools) {
                            this.items.push(utils.getCompletionItem(tool, `'${tool}'`, [
                                'packhouse self tool',
                                `${tool}`
                            ]))
                        }
                        for (let merger in mergers) {
                            let data = utils.parseName(mergers[merger])
                            let group = this.config.getGroup(data.group, data.sign)
                            for (let tool in group.tools) {
                                this.items.push(utils.getCompletionItem(`${merger}/${tool}`, `'${merger}/${tool}'`, [
                                    'packhouse merger',
                                    `${merger} : ${mergers[merger]}`
                                ]))
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
                                    this.items.push(utils.getCompletionItem(include, `'${include}'`, [
                                        'packhouse include',
                                        `${include} : ${target.used}`
                                    ]))
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
                                    this.items.push(utils.getCompletionItem(include, `'${include}'`, [
                                        'packhouse include',
                                        `${include} : ${target.used}`
                                    ]))
                                }
                            }
                        }
                    }
                }
            } else {
                let tools = this.config.getAllTools()
                for (let tool of tools) {
                    this.items.push(utils.getCompletionItem(tool.name, `'${tool.name}'`, [
                        'packhouse tool',
                        tool.info
                    ]))
                }
            }
        })
        this.register(['.action(', '.promise('], (prefix, document, position) => {
            let data = loader(document.getText(), position.line)
            let action = this.readed.getAction()
            if (this.inPackhouseFile) {
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
            } else {
                if (data?.type === 'tool') {
                    let parse = utils.parseName(data.name)
                    let tool = this.config.getTool(parse.group, parse.target, parse.sign)
                    if (tool) {
                        this.addToolItem(tool, data.method, data.hasNoGood)
                    }
                }
            }
            if (data?.type === 'line' && data.method === 'action') {
                this.items.push(utils.getCompletionItem('callback', `(error, result) => {}`, [
                    'packhouse always next'
                ]))
                if (this.inPackhouseFile && action === 'handler') {
                    this.items.push(utils.getCompletionItem('access', `self.access()`, [
                        'packhouse always next'
                    ]))
                }
            }
        })
        this.register(['.noGood('], (prefix, document, position) => {
            let data = loader(document.getText(), position.line)
            if (data?.type !== 'tool') {
                return null
            }
            this.items.push(utils.getCompletionItem('NoGoodError', `self.error`, [
                'packhouse no good'
            ]))
            this.items.push(utils.getCompletionItem('NoGoodResponse', `e => self.response(e, 500)`, [
                'packhouse no good'
            ]))
        })
        this.register(['.always('], (prefix, document, position) => {
            let data = loader(document.getText(), position.line)
            if (data?.type !== 'tool') {
                return null
            }
            this.items.push(utils.getCompletionItem('AlwaysNext', `next`, [
                'packhouse always next'
            ]))
        })
    }
}

export default Main
