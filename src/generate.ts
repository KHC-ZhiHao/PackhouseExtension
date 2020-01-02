/* tslint:disable */

const fs = require('fs')
const packhouse = require('packhouse')
const functionArguments = require('fn-args')

packhouse.utils.order = () => null

function getGroups(localPath) {
    let files = fs.readdirSync(localPath)
    let groups = []
    for (let file of files) {
        groups.push({
            name: file.split('.')[0],
            path: `${localPath}/${file}`,
            ...require(`${localPath}/${file}`)
        })
    }
    return groups
}

function getMergers(localPath) {
    let signs = fs.readdirSync(localPath)
    let mergers = {}
    for (let sign of signs) {
        mergers[sign] = {
            molds: {},
            groups: []
        }
        let files = fs.readdirSync(`${localPath}/${sign}`)
        for (let file of files) {
            let result = require(`${localPath}/${sign}/${file}`)
            if (result.groups && result.molds) {
                mergers[sign].molds = result.molds
            } else if (result.groups) {
                continue
            } else {
                mergers[sign].groups.push({
                    name: file.split('.')[0],
                    path: `${localPath}/${sign}/${file}`,
                    ...result
                })
            }
        }
    }
    return mergers
}

function parseMold(molds) {
    if (molds == null) {
        return {}
    }
    let output = {}
    for (let [name, value] of Object.entries(molds)) {
        if (typeof value === 'function') {
            output[name] = value.toString()
        } else {
            output[name] = {}
            for (let [key, verfiy] of Object.entries(value)) {
                output[name][key] = {
                    required: verfiy[0],
                    types: verfiy[1],
                    default: typeof verfiy[3] === 'function' ? verfiy[3]() : verfiy[3]
                }
            }
        }
    }
    return output
}

function findArgs(func) {
    return functionArguments(func).slice(1)
}

function simulationInstall(install) {
    let included = {}
    let packLength = {}
    if (install == null) {
        return {
            included
        }
    }
    let toolHandler = name => {
        return {
            always: () => toolHandler(name),
            noGood: () => toolHandler(name),
            pack: (...args) => {
                packLength[name] += args.length
                return toolHandler(name)
            }
        }
    }
    let include = name => {
        packLength[name] = 0
        included[name] = {}
        return {
            line: (used, ...args) => {
                packLength[name] += args.length
                included[name].used = used
                included[name].type = 'line'
            },
            tool: (used) => {
                included[name].used = used
                included[name].type = 'tool'
                return toolHandler(name)
            }
        }
    }
    install({
        group: {},
        store: {},
        include,
        utils: packhouse.utils
    })
    return {
        included,
        packLength
    }
}

function parseTool(tools) {
    if (tools == null) {
        return {}
    }
    let output = {}
    for (let name in tools) {
        let value = tools[name]
        output[name] = {
            info: value.info || '',
            args: findArgs(value.handler),
            request: value.request || [],
            response: value.response,
            ...simulationInstall(value.install)
        }
    }
    return output
}

function parseLine(lines) {
    if (lines == null) {
        return {}
    }
    let output = {}
    for (let name in lines) {
        let line = lines[name]
        output[name] = {
            info: line.info || '',
            args: findArgs(line.input),
            request: line.request || [],
            response: line.response,
            layout: parseTool(line.layout),
            ...simulationInstall(line.install)
        }
    }
    return output
}

function parseGroup(group) {
    return {
        path: group.path,
        molds: parseMold(group.molds),
        tools: parseTool(group.tools),
        lines: parseLine(group.lines),
        mergers: group.mergers
    }
}

let groups = getGroups('./src/groups')
let mergers = getMergers('./src/mergers')
let output = {
    groups: {},
    mergers: {}
}

for (let group of groups) {
    output.groups[group.name] = parseGroup(group)
}

for (let sign in mergers) {
    let merger = mergers[sign]
    output.mergers[sign] = {
        molds: parseMold(merger.molds),
        groups: {}
    }
    for (let group of merger.groups) {
        output.mergers[sign].groups[group.name] = parseGroup(group)
    }
}

fs.writeFileSync('./.packhouse.json', JSON.stringify(output, null, 4))
