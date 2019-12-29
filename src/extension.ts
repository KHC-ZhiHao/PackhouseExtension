import * as glob from 'glob'
import * as vscode from 'vscode'

import Main from './main'

export function activate(context: vscode.ExtensionContext) {
	let rootPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(item => item.uri.fsPath)[0] : null
	if (rootPath) {
		let configPath = glob.sync(rootPath + '/**/.packhouse.json', { ignore: "**/node_modules/**" })[0]
		let system = new Main(configPath)
		vscode.window.onDidChangeActiveTextEditor(() => system.update())
	}
}

export function deactivate() {}
