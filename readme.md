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

加packages文件夹，里面加两个文件夹reactivity和shared,每个文件夹单独运行`pnpm init`，name加作用域，如`@vue/reactivity`、`@vue/shared`

配置，新建文件`pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

.npmrc配置，下载的时候，依赖依然在各个包里，而不是提取到.pnpm

```
shamefully-hoist=true
```

## 各个包相互引用

reactivity里建src文件夹，建index.ts

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}
```
shared里建src文件夹，建index.ts

```ts
import { isObject } from '@vue/reactivity'
console.log(isObject({ a: 1 }))

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
      "@vue/*": ["./packages/src/*"]
    }, // 路径映射，将@vue/*映射到./packages/*
  }
}
```
最重要的是，paths的映射。

## 写打包脚本 - esbuild

安装esbuild

```shell
pnpm install esbuild -w -D
```







