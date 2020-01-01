function clearString(text: string): any {
    let type = null
    let count = 0
    let inner = ''
    let result = ''
    let inString: any = false
    for (let i = text.length; i > 0; i--) {
        // break point
        if (count === 0) {
            let char = result[0]
            if (char === 'v' && result.slice(0, 4) === 'var ') {
                break
            }
            if (char === 'l' && result.slice(0, 4) === 'let ') {
                break
            }
            if (char === 'c' && result.slice(0, 6) === 'const ') {
                break
            }
            if (char === 'i' && result.slice(0, 3) === 'if ') {
                break
            }
            if (char === 'f' && result.slice(0, 4) === 'for ') {
                break
            }
            if (char === '=' && result.slice(0, 2) === '= ') {
                break
            }
            if (char === ',') {
                break
            }
        }
        // end
        if (count === 0 && (result[0] === 't' || result[0] === 'l')) {
            let check = result.slice(0, 5)
            if (check === 'tool(' || check === 'line(') {
                type = check === 'line(' ? 'line' : 'tool'
                break
            }
        }
        let char = text[i]
        if (char === `"` || char === `'` || char === '`') {
            if (inString) {
                if (inString === char && text[i - 1] !== '\\') {
                    inString = false
                }
            } else {
                inString = char
            }
        }
        if (char === '(') {
            if (inString === false) {
                count -= 1
            }
        }
        if (count !== 0) {
            inner = char + inner
        }
        if (count === 0 && char != null) {
            result = char + result
        }
        if (char === ')' && count === 0) {
            inner = ''
        }
        if (char === ')') {
            if (inString === false) {
                count += 1
            }
        }
    }
    return {
        type,
        text: result,
        used: inner.slice(1, -1)
    }
}

function loaderLine(text: string) {
    return {
        data: text.split('.').filter(t => !!t).map(t => t.trim()),
        done: text.includes('tool()') || text.includes('line()()')
    }
}

function getObjectChain(lines: Array<string>, line: number): Array<string> {
    if (lines[line]) {
        let loader = loaderLine(lines[line])
        if (loader.done) {
            return loader.data
        } else {
            return getObjectChain(lines, line - 1).concat(loader.data)
        }
    } else {
        return []
    }
}

export default (document: string, line: number) => {
    let doc = document.split('\n').slice(0, line + 1).join('\n')
    let clear = clearString(doc)
    let lines = clear.text.split('\n')
    let chain = getObjectChain(lines, lines.length - 1).filter(t => !!t)
    if (clear.used && clear.type) {
        return {
            name: clear.used,
            type: clear.type,
            method: chain.includes('action()') ? 'action' : 'promise',
            hasNoGood: chain.includes('noGood()'),
            hasAlways: chain.includes('always()')
        }
    } else {
        return null
    }
}