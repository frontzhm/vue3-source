---
title: watchEffect的简易版 - 源码系列8
tags: vue
categories: vue
theme: vue-pro
highlight:
---

写 watchEffect了，这个真真算容易了！

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

![watchEffect\_1](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5944efba056e4ec9929fd58111cb92a1~tplv-k3u1fbpfcp-zoom-1.image)

没有加配置的 watchEfect，默认是异步执行的，这里先将其设置为同步，异步之后再写。

## 分析 watchEffect

*   watchEffect 是一个函数，可以有 2 个参数
*   第一个参数，是回调函数
*   第二个参数，是配置项，暂时不管

最重点的是，这个和 effect 走起来基本一模一样啊！

## 写 watchEffect

在`reactivity/src/apiWatch`下：

```js
export function watchEffect(cb) {
  const _effect = new ReactiveEffect(cb, null);
  _effect.run();
}
```

换回自己的，就可以了！

## 清除上一次的watch

有一种需求，某个值发生变化时触发请求，但是新一轮的请求如果迟于上一轮的请求回来，就会出现上一轮的请求覆盖了新一轮的，那么怎么清除上一次的请求呢。


