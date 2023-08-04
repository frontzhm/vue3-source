---
title: watchEffect和清除 - 源码系列8
tags: vue
categories: vue
theme: vue-pro
highlight:
---

写 watchEffect 和清除逻辑 了！

## 目标 watchEffect

首先看下，目标 watchEffect 的功能：

```js
import {
  reactive,
  effect,
  watch,
  watchEffect,
} from '../../../node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.js';
// import { reactive, effect,watch } from './reactivity.js';
const obj = reactive({
  name: 'hua',
  age: 4,
});
// 默认是异步，这边暂时只实现同步
watchEffect(
  () => {
    console.log(obj.name);
  },
  { flush: 'sync' }
);
obj.name = 'hua changed';
```

![watchEffect_1](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/watchEffect_1.png)

没有加配置的 watchEfect，默认是异步执行的，这里先将其设置为同步，异步之后再写。

## 分析 watchEffect

- watchEffect 是一个函数，可以有 2 个参数
- 第一个参数，是回调函数
- 第二个参数，是配置项

最重点的是，这个和 effect 走起来基本一模一样啊！

## 写 watchEffect

先写判断，是不是响应式对象，是不是函数

在`reactivity/src/apiWatch`下：

```js
export function watchEffect(cb) {
  const _effect = new ReactiveEffect(cb, null);
  _effect.run();
}
```

换回自己的，就可以了！
