# readme

```shell
mkdir vue-source
cd vue-source
pnpm init (npm i pnpm -g)
git init
```

```js
"private": true,
```

加 packages 文件夹，里面加两个文件夹 reactivity 和 shared,每个文件夹单独运行`pnpm init`，name 加作用域，如`@vue/reactivity`、`@vue/shared`

配置，新建文件`pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

.npmrc 配置，下载的时候，依赖依然在各个包里，而不是提取到.pnpm

```
shamefully-hoist=true
```

## 各个包相互引用

reactivity 里建 src 文件夹，建 index.ts

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};
export function reactive() {}
```

shared 里建 src 文件夹，建 index.ts

```ts
import { isObject } from '@vue/reactivity';
console.log(isObject({ a: 1 }));
```

## 引用其他包

这里，`import { isObject } from '@vue/reactivity'`引用了其他包内容需要进行设置：

运行命令`tsc --init`，生成`tsconfig.json`，填入以下

```json
{
  "compilerOptions": {
    "outDir": "./dist/", // 输出目录
    "sourceMap": true, // 生成sourceMap
    "module": "ESNext", // 模块格式
    "target": "ES2016", // 编译后的目标代码
    "strict": false, // 非严格模式
    "moduleResolution": "node", // 模块解析策略node
    "resolveJsonModule": true, // 支持导入json
    "esModuleInterop": true, // 支持commonjs导入
    "jsx": "preserve", // 不解析jsx
    "lib": ["ESNext", "DOM"], // 编译时需要引入的库
    "baseUrl": "./", // 用于解析非相对模块名称的基本目录
    "paths": {
      "@vue/*": ["./packages/*/src"]
    } // 路径映射，将@vue/*映射到./packages/*
  }
}
```

最重要的是，paths 的映射。

## 写打包脚本 - esbuild

1. 安装 esbuild

```shell
pnpm install esbuild -w -D
```

2. 写脚本 - 建 scripts 文件夹，建 dev.mjs

```js
// const {build} = require('esbuild')
import * as esbuild from 'esbuild';

const target = 'reactivity';

const ctx = await esbuild.context({
  entryPoints: [`packages/${target}/src/index.ts`],
  outfile: `packages/${target}/dist/${target}.js`, // 出口文件
  bundle: true, // 打包成一个文件
  minify: false, // 不压缩
  sourcemap: true, // 生成sourcemap
  format: 'esm', // 输出格式
  platform: 'browser', // 平台
});

await ctx.watch();
console.log('watching...');
```

3. 写脚本命令 - package.json

```json
  "scripts": {
    "dev": "node scripts/dev.mjs",
    "start": "pnpm run dev"
  },
```

4. 运行命令，生成 dist

```shell
pnpm start
```

## reactivity

### 1. 先安装 vue3，作为目标对齐

```shell
pnpm i vue -w
```

### 2. 写个 index.html，感受 reactivity

在 reactivity/dist 新建 index.html

```html
<body>
  <script type="module">
    import {
      reactive,
      effect,
    } from '../../../node_modules/@vue/reactivity/dist/reactivity.esm-browser.prod.js';
    const state = reactive({
      count: 0,
    });
    // Proxy {count:0}
    console.log(state);

    setTimeout(() => {
      state.count++;
      // 1
      console.log(state.count);
    }, 1000);
  </script>
</body>
```

在项目根目录，运行`anywhere`，如果没有就`npm i anywhere -g`之后在运行，页面打开控制台就能看到相关数据了

然后，换成我们自己的 reactivity 路径

```js
// import { reactive } from '../../../node_modules/@vue/reactivity/dist/reactivity.esm-browser.prod.js';
import { reactive } from './reactivity.js';
```

### 改 reactivity 的目录结构

将 reactivity/src 的 index.ts 作为导出接口，具体文件另起

于是有 2 个文件：

reactive.ts

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};
export function reactive() {}
```

index.ts

```ts
export * from './reactive';
```

### 分析 reactive

1. reactive 肯定是个函数
1. 输入：输入是一个对象，不是对象，直接返回
1. 输出：输出是一个 Proxy 实例

还有 3 个要点，也是难点：

- 解决对象的`get`有依赖属性的问题，需要将 this 的指向修改（后面细说）
- 对象被代理过之后，再代理同一个对象的话，需要直接返回上一次代理
- 对象被代理后的代理实例，如果再次被代理，需要仍然直接返回上一次代理

### 寻常返回 proxy 对象

先说下，所谓代理，就是**代为处理**。proxy 的基础不再赘述，简言之，访问对象，本质访问其代理。

先解决这些：

1. reactive 肯定是个函数
1. 输入：输入是一个对象，不是对象，直接返回
1. 输出：输出是一个 Proxy 实例

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};
export function reactive(target) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return;
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      console.log('get', key);
      return target[key];
    },
    set(target, key, value, receiver) {
      console.log('set', key, value);
      target[key] = value;
      return true;
    },
  });
  return proxy;
}
```

发现生效了！这算是最最基础版了！
接下来，解决难点，进阶版来了

## 解决 get 有依赖属性的问题 - Reflect

举个例子说明，建 test-proxy.js:

```js
let person = {
  name: 'hua',
  get aliasName() {
    console.log(this);
    return `alias-${this.name}`;
  },
};
let proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('读取key', key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value) {
    target[key] = value;
    return true;
  },
});

proxy.aliasName;
```

先不运行，猜，`读取key`输出几次。
其实是一次，`aliasName`。

流程如下:
`proxy.aliasName`
=> `proxy的get方法，打印，target这里指person`  
=> `person.aliasName`是 get 属性，其`this.name`的`this`指向的是`person`，也就 `alias-${person.name}`  
=> 这里注意，并没有走`proxy.name`

这就是**BUG**。

解决方案的关键就是在`this`的指向，所以这里启动`Reflect`，将`this`的指向`proxy`。同理，`set`也一样。

```js
let proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('读取key', key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver);
    return true;
  },
});
```

新流程如下:
`proxy.aliasName`
=> `proxy的get方法，打印，target这里指person`  
=> `person.aliasName`是 get 属性，此时`this.name`的`this`指向的是`proxy`，会再走一次 `proxy的get方法`

这里可以将代码粘贴到浏览器执行，看下`this`在两种情况的下输出情况，第一次就是`person`，第二次是`proxy`。注意，编辑器里直接执行，并不能感知到`proxy`

将`reactive.ts`进行第一个优化：

```ts
// ...
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log('读取key', key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver);
    return true;
  },
});
```

## 对象第二次代理的话，直接返回第一次代理 - WeakMap

举个例子：

在`index.html`里输入以下

```js
import { reactive } from './reactivity.js';
const obj = {
  count: 0,
};
const state = reactive(obj);
const state2 = reactive(obj);
console.log(state === state2);
```

显然是 false，因为会做两次代理。

那怎么让第二次的代理，直接返回第一次代理呢？

你们可能想到了，存下呗（缓存）！

设置一个映射，代理的时候，若对象在映射表，直接返回，不在就继续，且加到映射里。

这里有个细节，普通对象，键不能是对象，这里非常适合用[`WeakMap`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)

![weakmap](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/weakmap.png)

将`reactive.ts`进行第二个优化：

```ts
// 代理对象的映射
const reactiveMap = new WeakMap();

export function reactive(target) {
  // ...
  // 如果已经代理过了，直接返回
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }
  // const proxy ....
  // 如果没有代理过，缓存映射
  reactiveMap.set(target, proxy);
  return proxy;
}
```

`index.html`刷新下，`true`了

## 代理，对象被代理后的代理实例，直接返回代理

举个例子：

还是`index.html`

```js
import { reactive } from './reactivity.js';
const obj = {
  count: 0,
};
const state = reactive(obj);
// 就这里，reactive改成state了
const state2 = reactive(state);
console.log(state === state2);
```

就是对象被代理后的代理实例，再次被代理，现在肯定是`false`。

那怎么返回第一次代理的值呢！

嗯，其实就是做个标记

```ts
  // ...
  // 如果已经代理过了，__v_isReactive肯定是true，那直接返回
  if (target.__v_isReactive) {
    return target
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      console.log('读取key', key);
      // 这里埋点，加上__v_isReactive属性，标识已经代理过了
      if (key === '__v_isReactive') {
        return true
      }
      // ...
      }
  })
```

一旦被代理过，就一定被埋点，那就标识了。

`index.html`刷新下，`true`了

## 附上完整版`reactive.ts`

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}

// 代理对象的映射
const reactiveMap = new WeakMap()

export function reactive(target) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return
  }

  // 如果已经代理过了，直接返回
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }

  // 如果已经代理过了，__v_isReactive肯定是true，那直接返回
  if (target.__v_isReactive) {
    return target
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      console.log('读取key', key);
      // 这里埋点，加上__v_isReactive属性，标识已经代理过了
      if (key === '__v_isReactive') {
        return true
      }
      // Reflect将target的get方法里的this指向proxy上，也就是receiver
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      Reflect.set(target, key, value, receiver);
      return true;
    },
  })
  // 如果没有代理过，缓存映射
  reactiveMap.set(target, proxy)
  return proxy
}
```

