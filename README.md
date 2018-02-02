# zeroman

> Node.js Testing Toolkit

A collection of useful testing utilities. The goal of the utilities included in `zeroman` is to make working with TDD, BDD testing easy with some popular techniques, such as intercepting console log, set/reset environment variables, ...

## Importing

```shell
npm install --save-dev zeroman
```

Import `zeroman` in node.js module:

```js
var z0 = require('zeroman');
```

## Usage

- [envCustomizer](#envCustomizer)
- [processRunner](#processRunner)

### `envCustomizer`

#### Methods

##### `z0.envCustomizer.setup()`

##### `z0.envCustomizer.reset()`

##### `z0.envCustomizer.new()`

#### Example

```javascript
var z0 = require('zeroman')

z0.envCustomizer.setup({
  NODE_ENV: 'staging',
  ZEROMAN_V1: 'hello world',
  ZEROMAN_V2: 1024
})

// do something with `ZEROMAN_V1`, `ZEROMAN_V2`
console.log('NODE_ENV: ', NODE_ENV); // staging
console.log('ZEROMAN_V1: ', ZEROMAN_V1); // 'hello world'
console.log('ZEROMAN_V2: ', ZEROMAN_V2); // '1024'

// create sub customizer
var sub = z0.envCustomizer.new({
  ZEROMAN_V2: 4096
});

// do something with new `ZEROMAN_V2`
console.log('ZEROMAN_V2: ', ZEROMAN_V2); // '4096'

sub.reset();

// `ZEROMAN_V2` is set back to 1024
console.log('ZEROMAN_V2: ', ZEROMAN_V2); // '1024'

// reset the environment
z0.envCustomizer.reset()
```
