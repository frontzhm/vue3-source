---
title: 手动调用和停止effect - 源码系列5
tags: vue
categories: vue
theme: vue-pro
highlight:
---

effect 真的心思缜密啊！

继续进阶版，属性发生变化，相应的\_effect 自动执行。这边添加，可以随时手动执行\_effect，也可以随时停止\_effect 自动执行

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
// 但可以手动执行
runner();
```

![effect_3](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_3.png)

## 继续分析 effect

- 有返回值 runner，runner 是一个函数，且这个函数等同于 effect.run
- runner.effect 是当前 effect 实例
- effect.stop，说明有 stop 方法，stop 之后，属性变化不主动触发 effect 执行，但是手动可以

## effect 函数返回 runner

runner 是个函数，等同于\_effect.run，注意绑定 this。

```js
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  // runner是个函数，等同于_effect.run，注意绑定this
  const runner = _effect.run.bind(_effect);
  // runner还有effect属性，直接赋值就好
  runner.effect = _effect;
  return runner;
}
```

index.html 里，走下，手动执行成功了！

## effect 实例有 stop 方法

stop 方法执行之后，属性变化的时候，当前 effect 实例不再主动执行，但是可以手动执行。

用一个 flag 来标志，要不要主动执行

```ts
class ReactiveEffect {
  // 是否主动执行
  private active = true;
  run() {
    // 如果不是主动执行，那么只是执行函数，不再赋值activeEffect，就不会触发track，track的第一行判断条件就是，没有activeEffect，直接return。
    if (!this.active) {
      this.fn();
      return;
    }
    // ...
  }
  stop() {
    if (this.active) {
      // 标记不主动执行
      this.active = false;
      // 清除依赖
      clearupEffect(this);
    }
  }
}
```
