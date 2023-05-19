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

reactivity里建index.ts

```ts
export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}
```
shared里建index.ts

```ts
import { isObject } from '@vue/reactivity'
console.log(isObject({ a: 1 }))

```

## 引用其他包

这里，`import { isObject } from '@vue/reactivity'`引用了其他包内容需要进行设置：

1. 运行命令`tsc --init`，生成`tsconfig.json`
1. 




