# AGen

**An open standard for sound, interoperable JavaScript asynchronous generators&mdash;by implementers, for implementers.**

An *Asynchronous Generator* is an [ES6 Generators](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-25.3) that yields on asynchrony, allowing asynchronous JavaScript to be written in a purely synchronous syntax without the use of a library. 



This specicification details the requirements of a generator's yield primitives, yield values, return values and error handling; providing an interoperable base which all *AGen* conformant generator implementations can be depended on to provide. As such, the specification should be considered very stable. Although the Asynchronous Generators organization may occasionally revise this specification with minor backward-compatible changes to address newly-discovered corner cases, we will integrate large or backward-incompatible only after careful consideration, discussion, and testing.

The core of *AGen* does not deal with supported asynchrony or their specifications. *AGen* does list the necessary requirements for an asynchrony to be supportable.

## Terminology

1. "generator" is an [ES6 Generator Function](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-25.3)
1. "generator object" is an [ES6 Generator Object](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-25.4)
1. "asynchronous generator" is a generator whose behavior conforms to this specification.
1. "implementation" is the function that wraps a root asynchronous generator and implements this specification.
1. "run-level" is the implementation frame of the call stack.
1. "asynchrony" is *any* object or function that represents an asynchronous value or error. (See Supportable Asynchrony)
1. "value" is any legal JavaScript value (including `undefined`, an asynchrony, or a generator).
1. "exception" is a value that is thrown (either by the `throw` statement or not).
1. "parent generator" is the generator that `yield`s or `yield*`s on a yield primitive.
	* In the following example, foo is said to be the parent of bar.

```javascript
function* foo() {
  yield bar
}
```

## Requirements

1. Supportable Asynchrony
1. Yield Primitives
1. Yield Values
1. Error Handling
1. Return Values
1. Run-level
1. Yield Objects

### Supportable Asynchrony

Supportable asynchrony must:

1. Have an API to extract a single value.
2. Have an API to extract an error.

### Yield Primitives

A generator may only `yield` on 1 of 4 types:

1. asynchrony
	- Ex. `yield asynchrony`
1. generator objects
	- Ex. `yield* (function*(){})()`
1. array of asynchrony and/or generators objects
	- Ex. `yield [(function*(){})(), asynchrony]`
    - All elements must run in parallel.
1. An Object [See Yield Objects]

### Yield Values

Implementations must pass yield values from yield primitive to `generator.send()`.

The yield values for the corresponding yield primitives should be,

1. asynchrony - The value as specified by the corresponding asynchrony specification.
1. generator object - The return value of the generator function.
1. array - An array of the preceding yield primitives' values with order maintained.
1. object - [See Yield Objects] 

### Error Handling

Like in node.js there are two error paths: exceptions and errors. Non-exceptions error paths are asynchrony specific. (e.g., the first argument of a node.js callback, aka thunk)

1. If a Yield Primitive throws an exception,
	1. The impelementation must catch the exception
	1. The implemenation must pass the exception to `generatorObject.throw()`
	1. If/when the generator does not catch the exception
		1. The implementation must catch the exception
		2. The implementation must pass the exception to `parentGeneratorObject.throw()`
		3. If/when no parent generator exists (i.e., you are at the run-level)
			1. The implementation must choose how to handle the exception
1. If a Yield Primitive passes an error
	1. The error must be interceptable via `yield {both: YieldPrimitive}`
	1. If/when not intercepted
		1. The implementation must immediately return the error to the parent generator
		1. If/when no parent generator exists (i.e., you are at the run-level)
			1. The implementation must choose how to handle the error.

### Return Values

Generators may return any value.

1. If/when an error is returned
	1. The implementation must handle it according to the Error Handling section on passed errors.
1. If/when a non-error value is returned
	1. If/when a parent generator exists
		1. The implementation must pass the value to `parentGeneratorObject.send()` per the Yield Value section.
	1. If/when no parent generator exists (i.e., we are at the run-level)
		1. The implementation must choose how to handle the value.

### Run-level

The run-level implementation must:

1. Ensure the requirements in all preceeding sections.
1. Accept a single root generator to begin execution.
1. Handle the following cases:
	1. Exception thrown by the root generator
	1. Error passed by the root generator
	1. Value returned by the root generator

### Yield Objects

Yielding on an object is a special case intended to allow for implementation to add additional helpers.

1. If/when the object is determiend to not be a supported asynchrony type
  1. If/when the object contains a `both` key
    1. If/when `object.both`'s value is a yield primitive
      1. The implementation must pass a tuple or an array of tuples of `[AsynchronyError, AsynchronyValue]` to `parentGeneratorObject.send()`.
  1. If/when the object contains any other supported helper key.
    1. The implementation must choose how to handle the object.
  1. Otherwise, the parent generator should return an error.

## FAQ

**Why separate Errors and Exceptions?**

Short answer: node.js.

Long answer: Node.js error handling is necessarily different from browser error handling for the following reasons:

* node.js core shares the same call stack as application code
* node.js core always executes at the top of all call stacks
* node.js is highly asynchronous, even internally
* Because of the above, uncaught exceptions in application code prevent the core call stack from unwinding, placing it into an [undefined](nodejs.org/docs/latest/api/domain.html#domain_warning_don_t_ignore_errors) [state](https://github.com/joyent/node/issues/5149), requiring a restart of the process
* The required restart on uncaught exception is a DoS liability, and must therefore be mitigated by leaving exceptions for truly exceptional circumstances

**Why not explicitly support Promises A+ and Continuables?**

Because there's no real need or benefit to adopting a whitelist of supported Asynchrony.

If the list of community supported Asynchrony grows to be large, then the spec and implementation becomes cumbersome, and if the list is small, then supporting additional types and finding compatible implementations becomes trivial.

If all current potential AGen implementations already support promises and continuables, it's a moot point.
