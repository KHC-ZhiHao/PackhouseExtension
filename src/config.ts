import * as nodePath from 'path'
import * as utils from './utils'

interface tool {
    name: string
    info: string
}

interface line {
    name: string
    info: string
    layout: Array<tool>
    args: Array<string>
    request: Array<string>
}

export default class {
    public data: any = {}
    constructor(data: any) {
        this.data = data
    }

    getTool(group: string, tool: string, sign: string = '') {
        if (sign) {
            return this.data?.mergers[sign]?.groups[group]?.tools[tool]
        }
        return this.data?.groups[group]?.tools[tool]
    }

    getGroup(name: string, sign: string = '') {
        if (sign) {
            return this.data.mergers[sign].groups[name]
        } else {
            return this.data.groups[name]
        }
    }

    getToolUsed(group: any, name: string, used: string = '') {
        if (used === '') {
            return null
        }
        let mergers = group.data.mergers || {}
        let included = group?.data?.tools[name]?.included || {}
        let packLength = group?.data?.tools[name]?.packLength[used] || {}
        if (included[used]) {
            let tool = null
            let target = utils.parseName(included[used].used)
            if (mergers[target.group]) {
                let merger = utils.parseName(mergers[target.group])
                tool = this.getTool(target.group, target.target, merger.sign)
            } else {
                tool = this.getTool(group.name, target.target, group.sign)
            }
            if (tool) {
                return {
                    tool,
                    packLength
                }
            }
        }
        return null
    }

    getLineInToolUsed(group: any, name: string, used: string = '') {
        if (used === '') {
            return null
        }
        let mergers = group.data.mergers || {}
        let included = group?.data?.tools[name]?.included || {}
        let packLength = group?.data?.tools[name]?.packLength[used] || {}
        if (included[used]) {
            let line = null
            let target = utils.parseName(included[used].used)
            if (mergers[target.group]) {
                let merger = utils.parseName(mergers[target.group])
                line = this.getLine(target.group, target.target, merger.sign)
            } else {
                line = this.getLine(group.name, target.target, group.sign)
            }
            if (line) {
                return {
                    line,
                    packLength
                }
            }
        }
        return null
    }

    getLineInLineUsed(group: any, name: string, used: string) {
        let mergers = group.data.mergers || {}
        let included = group?.data?.lines[name]?.included || {}
        let packLength = group?.data?.lines[name]?.packLength[used] || {}
        if (included[used]) {
            let line = null
            let target = utils.parseName(included[used].used)
            if (mergers[target.group]) {
                let merger = utils.parseName(mergers[target.group])
                line = this.getLine(target.group, target.target, merger.sign)
            } else {
                line = this.getLine(group.name, target.target, group.sign)
            }
            if (line) {
                return {
                    line,
                    packLength
                }
            }
        }
        return null
    }

    getGroupTools(groups: any, sign: string = ''): Array<tool> {
        let tools: Array<tool> = []
        if (groups == null) {
            return []
        }
        for (let group in groups) {
            let groupTools = groups[group].tools || {}
            for (let name in groupTools) {
                tools.push({
                    name: `${sign}${group}/${name}`,
                    info: groupTools[name].info || 'no infomation'
                })
            }
        }
        return tools
    }

    getAllTools() {
        let tools: Array<tool> = []
        let groups = this.data.groups || {}
        let mergers = this.data.mergers || {}
        tools = tools.concat(this.getGroupTools(groups))
        for (let merger in mergers) {
            let groups = mergers[merger].groups || {}
            tools = tools.concat(this.getGroupTools(groups, merger + '@'))
        }
        return tools
    }

    getLine(group: string, line: string, sign: string = '') {
        if (sign) {
            return this.data?.mergers[sign]?.groups[group]?.lines[line]
        }
        return this.data?.groups[group]?.lines[line]
    }

    getAllLines() {
        let lines: Array<line> = []
        let groups = this.data.groups || {}
        let mergers = this.data.mergers || {}
        lines = lines.concat(this.getGroupLines(groups))
        for (let merger in mergers) {
            let groups = mergers[merger].groups || {}
            lines = lines.concat(this.getGroupLines(groups, merger + '@'))
        }
        return lines
    }

    getGroupLines(groups: any, sign: string = '') {
        let lines: Array<line> = []
        if (groups == null) {
            return []
        }
        for (let group in groups) {
            let groupLines = groups[group].lines || {}
            for (let name in groupLines) {
                lines.push({
                    name: `${sign}${group}/${name}`,
                    info: groupLines[name].info || 'no infomation',
                    args: groupLines[name].args || [],
                    request: groupLines[name].request || [],
                    layout: Object.entries(groupLines[name]).map(([key, value]: any) => {
                        return {
                            name: key,
                            info: value.info
                        }
                    })
                })
            }
        }
        return lines
    }

    getAllGroup() {
        let output = []
        let groups = this.data.groups || {}
        let mergers = this.data.mergers || {}
        for (let group in groups) {
            output.push({
                name: group,
                sign: null,
                data: groups[group]
            })
        }
        for (let merger in mergers) {
            let groups = mergers[merger].groups || {}
            for (let group in groups) {
                output.push({
                    name: group,
                    sign: merger,
                    data: groups[group]
                })
            }
        }
        return output
    }

    getGroupByPath(path: string): any {
        let groups = this.getAllGroup()
        for (let group of groups) {
            let source = nodePath.normalize(path.slice(0, -3))
            let target = nodePath.normalize(group.data.path.slice(1).replace('.ts', '').replace('.js', ''))
            if (source.slice(-(target.length)) === target) {
                return group
            }
        }
        return null
    }

    getPathByGroup(name: string, sign: string) {
        let groups = this.getAllGroup()
        for (let group of groups) {
            if (group.name === name) {
                if (sign && group.sign === sign) {
                    return group.data.path
                } else {
                    return group.data.path
                }
            }
        }
        return null
    }
}