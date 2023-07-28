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

## effect函数返回runner

runner是个函数，等同于_effect.run，注意绑定this。

```js
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  // runner是个函数，等同于_effect.run，注意绑定this
  const runner = _effect.run.bind(_effect)
  // runner还有effect属性
  runner.effect = _effect
  return runner
}
```

index.html里，走下，手动执行成功了！

## effect实例有stop方法

stop方法执行之后，属性变化的时候，当前effect实例不再主动执行，但是可以手动执行。

- 用一个flag来标志，要不要主动执行
- 难点是，让属性对应的该effect实例，从映射中删除，这样属性变化的时候，不会触发该effect实例执行

```ts
class ReactiveEffect {
  private fn
  private parent
  // 是不是主动执行 这就是flag
  private active = true
  constructor(fn) {
    this.fn = fn;
  }
  run() {
    // 通常是嵌套的effect，所以需要保存父级effect
    // 如果没有嵌套关系，那么这里的activeEffect肯定是null
    // 有的话，说明上一个effect没执行完，所以这里有上一个effect的引用
    this.parent = activeEffect
    // 重新将新的effect赋值给全局变量
    activeEffect = this;
    // 执行
    this.fn();
    // 执行完之后，将全局变量恢复成上一个effect，没有的话就是null
    activeEffect = this.parent
    // 如果有父级的话 将父级effect置空
    this.parent && (this.parent = null);
  }
  stop(){
    this.active = false
  }
}

```

