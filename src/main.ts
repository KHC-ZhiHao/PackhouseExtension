import * as fs from 'fs'
import * as path from 'path'
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
    public rootPath: string = ''
    public workPath: string
    public configPath: string = ''
    public registerItems: Array<registerItem> = []
    public inPackhouseFile: boolean = false
    constructor(workPath: string, configPath: string) {
        this.workPath = workPath
        this.rootPath = configPath.replace('.packhouse/dist.json', '').slice(0, -1)
        this.configPath = configPath
        this.handler()
        this.install()
        this.updatePage()
        fs.watchFile(this.configPath, () => {
            console.log('Packhouse: File change...')
            this.install()
            this.updatePage()
            console.log('Packhouse: Reinstall done.')
        })
    }

    install() {
        let data = {}
        try {
            data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
        } catch (error) {
            console.log(error)
        }
        this.config = new Config(data)
    }

    updatePage() {
        try {
            this.filePath = vscode.window.activeTextEditor?.document.uri.fsPath
            this.group = this.config.getGroupByPath(this.filePath || '')
            this.inPackhouseFile = !!this.group
        } catch (error) {
            console.log(error)
        }
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

    openFile(filePath: string, match?: string) {
        var lang = vscode.window.activeTextEditor.document.languageId
        let ext = lang === 'typescript' ? '.ts' : '.js'
        var openPath = vscode.Uri.file(filePath + ext)
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc)
            setTimeout(() => {
                if (match) {
                    this.toLineByMatch(doc.getText(), match)
                }
            }, 200)
        })
    }

    toLine(lineNumber) {
        let editor = vscode.window.activeTextEditor
        let range = editor.document.lineAt(lineNumber - 1).range
        editor.selection = new vscode.Selection(range.start, range.end)
        editor.revealRange(range)
    }

    toLineByMatch(doc, text) {
        let lines = doc.split('\n')
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(text)) {
                return this.toLine(i + 1)
            }
        }
    }

    definition(document: vscode.TextDocument, position: vscode.Position) {
        try {
            let reader = new Reader(document.getText(), position.line)
            let data = reader.getUnit()?.getAction()
            if (data == null) {
                return null
            }
            if (this.inPackhouseFile === false) {
                let name = utils.parseName(data.name)
                let path = this.config.getPathByGroup(name.group, name.sign)
                if (path) {
                    this.openFile(path, name.target + ':')
                }
                return null
            }
            let user = reader.getUser()
            let type = reader.getType()
            let action = reader.getAction()
            if (type == null || user == null) {
                return null
            }
            if (action === 'install') {
                let name = utils.parseName(data.name)
                if (name.group) {
                    let target = utils.parseName(this.group.data.mergers[name.group])
                    let path = this.config.getPathByGroup(target.group, target.sign)
                    if (path) {
                        this.openFile(path, name.target + ': {')
                    }
                } else {
                    this.toLineByMatch(document.getText(), name.target + ': {')
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    register(prefix: Array<string>, callback: (perfix: Array<string>, document: vscode.TextDocument, position: vscode.Position) => void) {
        this.registerItems.push({
            prefix,
            callback
        })
    }

    addToolItem(tool: any, method: string, hasNoGood: boolean, pack: number = 0) {
        let handler = getToolHandler(method, tool, hasNoGood, pack)
        this.addItem('args', handler.insert, [handler.desc])
        if (method === 'action') {
            this.addItem('args-and-no-callback', handler.noCallback, [handler.desc])
        }
    }

    addItem(name: string, insert: string, docs: Array<string> = []) {
        this.items.push(utils.getCompletionItem(name, insert, ['### packhouse extension'].concat(docs)))
    }

    handler() {
        this.register(['.'], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null || data.method != null || data.type !== 'line') {
                return null
            }
            if (this.inPackhouseFile === false) {
                let name = utils.parseName(data.name)
                let line = this.config.getLine(name.group, name.target, name.sign) || []
                for (let tool in line.layout) {
                    let handler = getToolHandler('line', line.layout[tool], false)
                    this.addItem(tool, `${tool}(${handler.insert})`, [handler.desc])
                }
                return null
            }
            let user = this.readed.getUser()
            let type = this.readed.getType()
            let action = this.readed.getAction()
            if (type == null || user == null) {
                return null
            }
            if (type === 'tool' && action === 'handler') {
                let used = this.config.getLineInToolUsed(this.group, user, data?.name)
                if (used) {
                    for (let tool in used.line.layout) {
                        let handler = getToolHandler('line', used.line.layout[tool], false)
                        this.addItem(tool, `${tool}(${handler.insert})`, [handler.desc])
                    }
                    return null
                }
            }
            if (type === 'line' && (action === 'handler' || action === 'input' || action === 'output')) {
                let used = this.config.getLineInLineUsed(this.group, user, data?.name)
                if (used) {
                    for (let tool in used.line.layout) {
                        let handler = getToolHandler('line', used.line.layout[tool], false)
                        this.addItem(tool, `${tool}(${handler.insert})`, [handler.desc])
                    }
                    return null
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
                    return null
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

            if (type === 'tool' && action === 'handler') {
                let used = this.config.getLineInToolUsed(this.group, user, data?.name)
                if (used) {
                    this.addToolItem(used.line, 'line', data.hasNoGood, used.packLength)
                }
            }
            if ((action === 'handler' || action === 'input' || action === 'output') && type === 'line') {
                let used = this.config.getLineInLineUsed(this.group, user, data?.name)
                if (used) {
                    this.addToolItem(used.line, 'line', data.hasNoGood, used.packLength)
                }
            }
        })
        this.register(['.line(\'', '.line("', '.line`'], (prefix, document, position) => {
            if (this.inPackhouseFile === false) {
                let lines = this.config.getAllLines()
                for (let line of lines) {
                    this.addItem(line.name, `${line.name}`, [line.info])
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
                    this.addItem(line, `${line}`, [utils.getArgsDoc(target.args, target.request)])
                }
                for (let merger in mergers) {
                    let data = utils.parseName(mergers[merger])
                    let group = this.config.getGroup(data.group, data.sign)
                    for (let line in group.lines) {
                        let target = group.lines[line]
                        this.addItem(`${merger}/${line}`, `${merger}/${line}`, [utils.getArgsDoc(target.args, target.request)])
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
                            this.addItem(include, `${include}`)
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
                            this.addItem(include, `${include}`, [`${include} : ${target.used}`])
                        }
                    }
                }
            }
        })
        this.register(['.tool(\'', '.tool("', '.tool(`'], () => {
            if (this.inPackhouseFile === false) {
                let tools = this.config.getAllTools()
                for (let tool of tools) {
                    this.addItem(tool.name, `${tool.name}`, [tool.info])
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
                    this.addItem(tool, `${tool}`)
                }
                for (let merger in mergers) {
                    let data = utils.parseName(mergers[merger])
                    let group = this.config.getGroup(data.group, data.sign)
                    for (let tool in group.tools) {
                        this.addItem(`${merger}/${tool}`, `${merger}/${tool}`, [`${merger} : ${mergers[merger]}`])
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
                            this.addItem(include, `${include}`, [`${include} : ${target.used}`])
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
                            this.addItem(include, `${include}`, [`${include} : ${target.used}`])
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
            if (type) {
                if (action === 'handler' && type === 'tool') {
                    let user = this.readed.getUser()
                    if (user) {
                        let used = this.config.getToolUsed(this.group, user, data?.name)
                        if (used) {
                            this.addToolItem(used.tool, data.method, data.hasNoGood, used.packLength)
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
        })
        this.register(['.always('], (prefix, document, position) => {
            let data = this.readed.getUnit()?.getAction()
            if (data == null || data?.type !== 'tool') {
                return null
            }
            this.addItem('Always', '({ result, success }) => {$0}', ['packhouse always next'])
        })
    }
}

export default Main
