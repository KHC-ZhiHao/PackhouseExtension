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
            let groups = mergers[merger].groups
            tools = tools.concat(this.getGroupTools(groups, merger + '@'))
        }
        return tools
    }
}