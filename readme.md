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
export function reactive(){}
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

### 改reactivity的目录结构

将reactivity/src的index.ts作为导出接口，具体文件另起

于是有2个文件：

reactive.ts

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}
export function reactive(){ }
```
index.ts

```ts
export * from './reactive'
```

### 分析reactive

1. reactive肯定是个函数
1. 输入：输入是一个对象，不是对象，直接返回
1. 输出：输出是一个Proxy实例

还有3个要点，也是难点：
- 当对象有依赖属性的时候，将this的指向修改（后面细说）
- 对象被代理过之后，再代理同一个对象的话，直接返回上一次代理
- 对象被代理后的代理实例，如果再次被代理，仍然直接返回上一次代理





