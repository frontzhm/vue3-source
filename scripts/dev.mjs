// const {build} = require('esbuild')
import * as esbuild from 'esbuild'

const target = 'shared'

const ctx = await esbuild.context({
  entryPoints:[`packages/${target}/src/index.ts`],
  outfile: `dist/${target}.js`, // 出口文件
  bundle: true, // 打包成一个文件
  minify: false, // 不压缩
  sourcemap: true, // 生成sourcemap
  format: 'esm', // 输出格式
  platform: 'browser', // 平台
})

await ctx.watch()
console.log('watching...')
