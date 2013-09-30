var async = require("gens")

module.exports = {
    run: function (gen) {
        var args = [].slice.call(arguments, 1)
        async(gen).apply(null, args)
    },
    from: function (value) {
        return function (cb) {
            cb(null, value)
        }
    },
    error: function (err) {
        return function (cb) {
            cb(err)
        }
    },
    sleep: function (timeout) {
        return function (cb) {
            setTimeout(function () {
                cb(null, timeout)
            }, timeout)
        }
    }
}
