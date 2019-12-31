import * as nodePath from 'path'

interface tool {
    name: string
    info: string
}

export default class {
    public data: any = {}
    constructor(data: any) {
        this.data = data
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
            if (nodePath.normalize(path).match(nodePath.normalize(group.data.file).slice(1))) {
                return group
            }
        }
        return null
    }
}