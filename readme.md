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

