---
title: 实现effect - 源码系列3
tags: vue
categories: vue
theme: vue-pro
highlight:
---

写effect啦！

## 目标effect

先看 effect 的作用

```js
import {
  reactive,
  effect,
} from '../../../node_modules/@vue/reactivity/dist/reactivity.esm-browser.prod.js';
// import { reactive } from './reactivity.js';
const obj = {
  name: 'hua',
  age: 4,
};
const state = reactive(obj);

setTimeout(() => {
  state.name += ' hua';
  state.age++;
}, 1000);

setTimeout(() => {
  state.age++;
}, 2000);

effect(() => {
  console.log('effect', state.name, state.age);
});
```

控制台输出：

```shell
effect hua 4
# 1s后
effect hua hua 4
# 随后
effect hua hua 5
# 2s后
effect hua hua 6
```

每次effect里相关的响应式对象发生变化，effect就会执行一次。

## 分析目标effect

- effect本身是一个函数，输入是一个函数，暂时可以没输出
- effect得和响应式属性建立连接，属性变化，输入参数的函数就执行




