import * as fs from 'fs'
import * as vscode from 'vscode'

import * as utils from './utils'
import * as reader from './reader'

import Config from './config'

interface registerItem {
    prefix: Array<string>
    callback: (document: vscode.TextDocument, position: vscode.Position) => void
}

class Main {
    public items: Array<vscode.CompletionItem> = []
    public files: Array<string> = []
    public readed: any = {}
    public caller: any = null
    public config: Config = new Config({})
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
        this.inPackhouseFile = utils.checkInPackhouse()
    }

    keyIn(document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        this.items = []
        if (this.inPackhouseFile) {
            this.readed = reader.packhouseFile(this.config, document, position.line)
        } else {
            this.readed = reader.handlerFile(this.config, document, position.line)
        }
        let lineText = document.lineAt(position.line).text
        let charPosition = position.character
        for (let item of this.registerItems) {
            if (utils.checkPerfix(lineText, charPosition, item.prefix)) {
                item.callback(document, position)
            }
        }
        return this.items
    }

    register(prefix: Array<string>, callback: (document: vscode.TextDocument, position: vscode.Position) => void) {
        this.registerItems.push({
            prefix,
            callback
        })
    }

    handler() {
        this.register(['.tool('], (document, position) => {
            if (this.inPackhouseFile) {
                
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
    }
}

export default Main
