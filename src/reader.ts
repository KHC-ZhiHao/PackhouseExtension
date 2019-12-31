import * as ts from 'typescript'

function getSource(document: string): ts.SourceFile {
    return ts.createSourceFile('AST.ts', document, ts.ScriptTarget.ES2020, true)
}

function findNode(nowLine: number, source: ts.SourceFile, nodes: Array<ts.Node>): ts.Node | null {
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i]
        let line = source.getLineAndCharacterOfPosition(node.pos).line
        let endLine = source.getLineAndCharacterOfPosition(node.end).line
        if (line < nowLine && nowLine < endLine) {
            let children = node.getChildren()
            if (children.length === 0) {
                return node
            } else {
                return findNode(nowLine, source, children) || node
            }
        }
    }
    return null
}

function getDocNode(document: string, line: number) {
    let source = getSource(document)
    return {
        source,
        node: findNode(line, source, source.getChildren())
    }
}

function getPropertyName(text: string): string | null {
    text = text.trim().split('\n')[0].trim()
    if (text[0] === '{' || text[0] === '[') {
        return null
    }
    let name = text.split(/:|\(|=/)[0].trim()
    if (name[0] === `"` || name[0] === `'`) {
        return name.slice(1, -1)
    }
    return name
}

function getPropertyNameMatch(node: ts.Node, target: Array<string>): string | null {
    let property = getPropertyName(node.getText())
    if (target.includes(property || '')) {
        return property
    } else if (node.parent) {
        return getPropertyNameMatch(node.parent, target)
    } else {
        return null
    }
}

export class GroupFile {
    public node: ts.Node | null = null
    public types: Array<string> = ['tools', 'lines']
    public source: ts.SourceFile | null = null
    public actions: Array<string> = ['install', 'handler']
    constructor(document: string, line: number) {
        let data = getDocNode(document, line)
        this.node = data.node
        this.source = data.source
    }

    getUser(node?: ts.Node): string | null {
        if (this.node) {
            if (node == null) {
                node = this.node
            }
            let property = getPropertyName(node.getText())
            if (this.actions.includes(property || '')) {
                return getPropertyName(node.parent.parent.getText())
            }
            if (node.parent) {
                return this.getUser(node.parent)
            }
        }
        return null
    }

    getType(node?: ts.Node): string | null {
        if (this.node) {
            if (node == null) {
                node = this.node
            }
            let property = getPropertyName(node.getText()) || ''
            if (property.match('tools')) {
                return 'tool'
            }
            if (property.match('lines')) {
                return 'line'
            }
            if (node.parent) {
                return this.getType(node.parent)
            }
        }
        return null
    }

    getAction(): string | null {
        if (this.node) {
            return getPropertyNameMatch(this.node, this.actions)
        }
        return null
    }
}
