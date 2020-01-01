import * as nodePath from 'path'

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
            let source = nodePath.normalize(path)
            let target = nodePath.normalize(group.data.path.slice(1))
            if (source.slice(-(target.length)) === target) {
                return group
            }
        }
        return null
    }
}