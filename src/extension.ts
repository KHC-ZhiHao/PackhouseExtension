import * as glob from 'glob'
import * as vscode from 'vscode'

import Main from './main'

export function activate(context: vscode.ExtensionContext) {
	let rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(item => item.uri.fsPath)[0] : null
	if (rootPath) {
		let configPath = glob.sync(rootPath + '/**/.packhouse.json', { ignore: "**/node_modules/**" })[0]
		let main = new Main(configPath)
		let inputChars = ['.', '(']
		let keyIn = {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				return main.keyIn(document, position)
			}
		}
		let TS = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'typescript' }, keyIn, ...inputChars)
		let JS = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, keyIn, ...inputChars)
		context.subscriptions.push(TS)
		context.subscriptions.push(JS)
		vscode.window.onDidChangeActiveTextEditor(() => {
			main.updatePage()
		})
		console.log('packhouse done')
	}
}

export function deactivate() {}
