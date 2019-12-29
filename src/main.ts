import utils from './utils'

class Main {
    public configPath: string
    public data: any
    constructor(configPath: any) {
        this.data = {}
        this.configPath = configPath
        this.update()
    }

    update() {
        this.data = require(this.configPath)
    }
}

export default Main
