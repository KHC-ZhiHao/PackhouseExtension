import * as ts from 'typescript'
import { clearArgs } from './utils'

function getSource(document: string): ts.SourceFile {
    return ts.createSourceFile('AST.ts', document, ts.ScriptTarget.ES2020, true)
}

function findNode(nowLine: number, source: ts.SourceFile, nodes: Array<ts.Node>, precise: boolean = false): ts.Node | null {
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i]
        let line = source.getLineAndCharacterOfPosition(node.pos).line
        let endLine = source.getLineAndCharacterOfPosition(node.end).line
        if (precise && line <= nowLine - 1 && nowLine - 1 < endLine) {
            if (node.getText().trim() === '.') {
                return nodes[i - 1]
            } else {
                return node
            }
        }
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

class Unit {
    public unit: ts.Node
    public unitText: string = ''
    constructor(unit: ts.Node) {
        this.unit = unit
        this.unitText = unit.getText()
    }

    getAction() {
        let clear = clearArgs(this.unitText)
        let chain = clear.text.split('.').filter(t => !!t).map(t => t.trim())
        if (chain.includes('line()()') || chain.includes('tool()')) {
            return {
                name: clear.used[clear.typeUserIndex].slice(1, -1),
                type: chain.includes('line()()') ? 'line' : 'tool',
                method: chain.includes('action()') ? 'action' : (chain.includes('promise()') ? 'promise' : null),
                hasNoGood: chain.includes('noGood()'),
                hasAlways: chain.includes('always()')
            }
        }
        return null
    }

    hasUnitKeyWord(keyword: string): boolean {
        if (this.unitText) {
            return !!clearArgs(this.unitText).text.match(keyword)
        }
        return false
    }
}

export default class {
    public doc: any
    public line: number = 0
    public node: ts.Node | null = null
    public types: Array<string> = ['tools', 'lines']
    public source: ts.SourceFile | null = null
    public actions: Array<string> = ['install', 'handler', 'input', 'output']
    constructor(document: string, line: number) {
        this.doc = getDocNode(document, line)
        this.line = line
        this.node = this.doc.node
        this.source = this.doc.source
    }

    getUnit(): Unit | null {
        if (this.source && this.node) {
            let node = findNode(this.line, this.source, this.node.getChildren(), true)
            if (node) {
                return new Unit(node)
            }
        }
        return null
    }

    getUser(node?: ts.Node): string | null {
        if (this.node) {
            if (node == null) {
                node = this.node
            }
            let property = getPropertyName(node.getText())
            if (this.actions.includes(property || '')) {
                let type = this.getType()
                if (type) {
                    if (type === 'line') {
                        let now = node.parent.parent
                        let layout = now.parent.parent
                        if (getPropertyName(layout.getText())?.match('layout')) {
                            return getPropertyName(layout.parent.parent.getText())
                        } else {
                            return getPropertyName(now.getText())
                        }
                    } else {
                        return getPropertyName(node.parent.parent.getText())
                    }
                    
                } else {
                    return null
                }
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
