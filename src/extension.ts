import * as glob from 'glob'
import * as vscode from 'vscode'

import Main from './main'

(process as NodeJS.EventEmitter).on('uncaughtException', function (err) {
	console.log(err)
})

export function activate(context: vscode.ExtensionContext) {
	let rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(item => item.uri.fsPath)[0] : null
	if (rootPath) {
		let configPath = glob.sync(rootPath + '/**/.packhouse/dist.json', { ignore: "**/node_modules/**" })[0]
		if (configPath) {
			let main = new Main(context.extensionPath, configPath)
			let inputChars = ['.', '(', '`', '"', '\'']
			let hover = {
				provideHover(document, position) {
					return main.hover(document, position)
				}
			}
			let keyIn = {
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					return main.keyIn(document, position)
				}
			}
			let define = {
				provideDefinition(document: vscode.TextDocument, position: vscode.Position): any {
					return main.definition(document, position)
				}
			}
			let TS = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'typescript' }, keyIn, ...inputChars)
			let JS = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, keyIn, ...inputChars)
			let JSDefintion = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'javascript' }, define)
			let TSDefintion = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'typescript' }, define)
			let TSHover = vscode.languages.registerHoverProvider('javascript', hover)
			let JSHover = vscode.languages.registerHoverProvider('typescript', hover)
			context.subscriptions.push(TS)
			context.subscriptions.push(JS)
			context.subscriptions.push(TSHover)
			context.subscriptions.push(JSHover)
			context.subscriptions.push(JSDefintion)
			context.subscriptions.push(TSDefintion)
			vscode.window.onDidChangeActiveTextEditor(() => {
				main.updatePage()
			})
			console.log('packhouse done')
		} else {
			vscode.window.showErrorMessage('.packhouse/dist.json not fount.')
		}
	}
}

export function deactivate() {}
