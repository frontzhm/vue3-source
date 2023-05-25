---
title: 搭建vue源码项目环境 - 源码系列1
tags: vue
categories: vue
theme: vue-pro
highlight:
---

运行以下命令，建项目目录

```shell
mkdir vue-source
cd vue-source
pnpm init (npm i pnpm -g)
git init
```


根目录加 `packages` 文件夹，里面加两个文件夹 `reactivity` 和 `shared`，在每个文件夹路径下，分别单独运行`pnpm init`，然后再各自的`package.json`里，将`name` 加上作用域，如`@vue/reactivity`、`@vue/shared`

配置，根目录新建文件`pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

根目录，新建文件`.npmrc` 进行配置，这样下载的时候，依赖依然在各个包里，而不是提取到`.pnpm`

```shell
shamefully-hoist=true
```

## 各个包之间的引用

各个包之间的引用，需要做一些准备工作。

文件夹`reactivity` 里建 `src/index.ts`，

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};
export function reactive() {}
```

文件夹`shared` 里建 `src/index.ts`，

```ts
import { isObject } from '@vue/reactivity';
console.log(isObject({ a: 1 }));
```

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

最重要的是，`paths` 的映射。

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

好了，搭建环境成功了！
