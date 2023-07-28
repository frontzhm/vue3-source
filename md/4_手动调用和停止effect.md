---
title: 手动调用和停止effect - 源码系列4
tags: vue
categories: vue
theme: vue-pro
highlight:
---

上次写完简单版的 effect，监测的属性发生变化，相应的 effect 就会自动执行。

本文进阶版，属性发生变化，可以手动调用相应的 effect 执行，也可以随时停止响应的 effect。

## 目标 effect

先看 effect 的手动调用和停止

```js
// index.html
import {
  reactive,
  effect,
} from '../../../node_modules/@vue/reactivity/dist/reactivity.esm-browser.prod.js';
// import { reactive, effect } from './reactivity.js';
const obj = reactive({
  name: 'hua',
  age: 4,
});

// 这里默认执行
const runner = effect(() => {
  console.log('effect', obj.name);
});

// 这里，数据没有发生变化，但手动调用执行
runner();
// 这两种写法等同，都是手动调用执行
runner.effect.run();

// 数据发生变化，自动执行effect
obj.name = 'hua2 自动执行';
// 手动停止
runner.effect.stop();
// 数据发生变化，不会自动执行effect
obj.name = 'hua3 effect停止之后 手动执行';
// 可以手动执行
runner();
```

![effect_3](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_3.png)


## 继续分析effect

- 有返回值，返回值是一个函数，且这个函数等同于 effect.run
- 返回值.effect是当前effect实例
- effect.stop，说明有stop方法，stop之后，属性变化不主动触发effect执行，但是手动可以
- 用一个flag去控制，是不是主动更新

## 先返回runner


