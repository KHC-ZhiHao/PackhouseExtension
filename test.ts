import b from './src/loader'
var a = `
    self.packhouse
        .tool('fuck').noGood(() => {
            var a = () => console.log('how der( you')
            a()
            self.packhouse
                .tool('fuck').noGood(() => {
                    var a = () => console.log('how der( you')
                    a()
                })
        })
        .action(() => {})
`

console.log(b(a, 10))