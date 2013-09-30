var test = require("tape")
var util = require("util")

module.exports = testGenerators

function testGenerators(impl) {
    test("generator may return value", function (assert) {
        var gen1 = function* () {
            return 5
        }
        var gen2 = function* () {
            return "str"
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)
            assert.equal(value, 5)

            impl.run(gen2, function (err, value) {
                assert.ifError(err)
                assert.equal(value, "str")

                assert.end()
            })
        })
    })

    test("generator may return error", function (assert) {
        var gen1 = function* () {
            return new Error("normal error")
        }

        impl.run(gen1, function (err, value) {
            assert.equal(err.message, "normal error")

            assert.end()
        })
    })

    test("generators can yield AV's", function (assert) {
        var gen1 = function* () {
            return yield impl.from("str")
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)
            assert.equal(value, "str")

            assert.end()
        })
    })

    test("generators can yield an array of AV's", function (assert) {
        var gen1 = function* () {
            var start = Date.now()
            var items = yield [
                impl.sleep(10),
                impl.sleep(20),
                impl.sleep(30),
                impl.sleep(40),
                impl.sleep(50),
                impl.from(60),
                impl.from("some text")
            ]
            return { time: Date.now() - start, items: items }
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)
            assert.ok(value.time < 53)
            assert.deepEqual(value.items, [
                10, 20, 30, 40, 50, 60, "some text"
            ])

            assert.end()
        })
    })

    test("can yield array of generator objects", function (assert) {
        var gen1 = function* () {
            var times = [10, 20, 30, 40, 50]
            var counter = 0
            var maxCounter = 0

            var values = yield times.map(function* (time) {
                counter++
                maxCounter = counter
                yield impl.sleep(time)
                counter--

                return time * 3
            })

            return { values: values, maxCounter: maxCounter, counter: counter }
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)

            assert.deepEqual(value.values, [30, 60, 90, 120, 150])
            assert.equal(value.counter, 0)
            assert.equal(value.maxCounter, 5)

            assert.end()
        })
    })

    test("can yield { both: AV }", function (assert) {
        var gen1 = function* () {
            var left = yield { both: impl.error(new Error("oops")) }
            var right = yield { both: impl.from("correct") }

            return { left: left, right: right }
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)

            assert.equal(value.left[0].message, "oops")
            assert.equal(value.left[1], undefined)
            assert.equal(value.left.length, 2)
            assert.deepEqual(value.right, [null, "correct"])

            assert.end()
        })
    })

    test("can yield* another generator", function (assert) {
        var gen1 = function* () {
            return (yield* gen2()) + (yield* gen2())
        }
        var gen2 = function* () {
            yield impl.sleep(10)

            return (yield impl.from(2)) + (yield impl.from(3))
        }

        impl.run(gen1, function (err, value) {
            assert.ifError(err)

            assert.equal(value, 10)

            assert.end()
        })
    })

    test("can yield errors", function (assert) {
        var gen1 = function* () {
            yield impl.error(new Error("error"))
        }
        var gen2 = function* () {
            yield impl.sleep(10)

            yield impl.error(new Error("error"))
        }

        impl.run(gen1, function (err, value) {
            assert.equal(err.message, "error")
            assert.equal(value, undefined)

            impl.run(gen2, function (err, value) {
                assert.equal(err.message, "error")
                assert.equal(value, undefined)

                assert.end()
            })
        })

    })

    test("can throw errors", function (assert) {
        var gen1 = function* () {
            throw new Error("thrown error")
        }
        var gen2 = function* () {
            var data = yield impl.from(10)

            throw new Error("thrown error after yield " + data)
        }

        assert.throws(function () {
            impl.run(gen1, function () {})
        }, /thrown error/)

        assert.throws(function () {
            impl.run(gen2, function () {})
        }, /thrown error after yield 10/)

        assert.end()
    })

    test("can intercept yielded errors", function (assert) {
        var task = function* (key) {
            var tuple = yield { both: dbGet(key) }

            return tuple[0] ? null : tuple[1]
        }

        var dbGet = function* (key) {
            yield impl.sleep(5)

            var tuple = yield { both: readFile("/keys/" + key) }

            if (tuple[0]) {
                return new Error("NotFound")
            }

            return tuple[1]
        }

        var readFile = function (location) {
            if (location === "/keys/foo") {
                return impl.from("bar")
            } else {
                return impl.error(new Error("could not find " + location))
            }
        }

        impl.run(task, "bar", function (err, value) {
            assert.ifError(err)

            assert.equal(value, null)

            impl.run(task, "foo", function (err, value) {
                assert.ifError(err)

                assert.equal(value, "bar")

                assert.end()    
            })
        })
    })

    test("can intercept thrown errors", function (assert) {
        var task = function* (key) {
            try {
                return yield* dbGet(key)
            } catch (err) {
                return null
            }
        }

        var dbGet = function* (key) {
            try {
                yield impl.sleep(5)

                return yield readFile("/keys/" + key)
            } catch (err) {
                throw new Error("NotFound")
            }
        }

        var readFile = function (location) {
            if (location === "/keys/foo") {
                return impl.from("bar")
            } else {
                throw new Error("could not find " + location)
            }
        }

        impl.run(task, "bar", function (err, value) {
            assert.ifError(err)

            console.log("value", value)
            assert.equal(value, null)

            impl.run(task, "foo", function (err, value) {
                assert.ifError(err)

                console.log("value", value)
                assert.equal(value, "bar")

                assert.end()    
            })
        })
    })
}