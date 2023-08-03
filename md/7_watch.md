---
title: watch - 源码系列7
tags: vue
categories: vue
theme: vue-pro
highlight:
---

写 watch 了！

## 目标 watch

首先看下，目标 watch 的功能：

```js
import {
  reactive,
  effect,
  watch,
} from '../../../node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.js';
// import { reactive, effect } from './reactivity.js';
const obj = reactive({
  name: 'hua',
  age: 4,
});
watch(obj, (newVal, oldVal) => {
  console.log(newVal, oldVal);
});
watch(
  () => obj.name,
  (newVal, oldVal) => {
    console.log(newVal, oldVal);
  },
  { flush: 'sync' }
);
obj.name = '222';
console.log('数据变化了');
```

![watch_1](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/watch_1.png)

没有加配置的 watch，默认是异步执行的，这里先将其设置为同步，异步之后再写。

## 分析 watch

- watch 是一个函数，可以有三个参数
- 第一个参数，可以是函数-返回字段，也可以是响应式对象（暂时只考虑这两）
- 参数是函数-返回字段的时候，跟 effect，感觉基本一样啊
- 参数是响应式对象的时候，将每个属性和后面的函数映射起来，这样每个属性变化的时候，都会触发函数执行

## 写 watch

先写判断，是不是响应式对象，是不是函数

在`reactivity/src/reactive`下：

```js
export const isFunction = (param) => {
  return typeof param === 'function';
};
const __v_isReactive = '__v_isReactive';
// 是不是响应式对象，响应式对象在get的时候，加了这个属性
export const isReactive = (param) => param[__v_isReactive];
```

### 参数是函数-返回字段

参数是函数-返回字段的时候，本质其实就是 有 scheduler 的 effect。

之前的 effect 是这样的：

```js
effect(
  () => {
    console.log(obj.name);
  },
  { scheduler: () => {} }
);
new ReactiveEffect(fn, scheduler);
```

在`reactivity/src/apiWatch`下：

```ts
import { ReactiveEffect } from './effect';
import { isReactive, isFunction } from './reactive';
export function watch(source, cb) {
  const isReactive = isFunction(source);
  if (isReactive) {
    // source是函数-返回字段，()=>obj.name，就是fn直接执行，收集属性
    // scheduler只有在属性发生变化的时候，才会执行
    let oldValue;
    let newValue;
    const _effect = new ReactiveEffect(source, () => {
      // scheduler执行的时候，属性值已经发生变化，最新值通过run方法获取，等同于source(),()=>obj.name
      newValue = _effect.run();
      cb(newValue, oldValue);
      oldValue = newValue;
    });
    // watch的时候，首先这里执行一次，收集依赖 ()=>obj.name，建立属性和effect的映射
    oldValue = _effect.run();
  }
}
```

这里注意，给之前的`effect`的 run 加上返回值，因为这里的是需要返回属性值的

```js
run() {
    if (!this.active) {
      const res = this.fn()
      // 这里watch的时候，fn是函数返回字段，需要返回值
      return res;
    }
    // 后面也一样
    const res = this.fn();
    activeEffect = this.parent
    this.parent && (this.parent = null);
    return res
  }
```

总结下，这里 watch 响应式对象的属性，底层就是再用带有 scheduler 的 effect
`watch(()=>obj.name,(newVal,oldVal)=>{})`，`()=>obj.name`其实就是 fn，`(newVal,oldVal)=>{}`其实就是`scheduler`，建立属性和 effect 的映射之后，属性值发生变化，对应的 effect 的 scheduler 执行。
而 oldValue 和 newValue 需要每次更新，首次执行 watch，scheduler 并不执行，此时属性值是下一次属性值改变的 oldValue，而属性值发生改变的时候，新的值通过 run 重新获取，cb 执行，之后，再赋值给 oldValue，因为这是下一次属性值改变的 oldValue。

### 参数是响应式对象的时候

当参数是响应式对象的时候，即便将其变成函数`()=>obj`，但因为没有读取属性，所以属性并没有和 effect 建立映射。
所以，强制读取所有属性，这样算是强迫属性和 effect 建立映射

先将上面的参数是函数的情况，提取成一个函数

```ts
// watch字段，提取成一个函数
function watchFunction (source, cb)  {
  // source是函数-返回字段，()=>obj.name，就是fn直接执行，收集属性
  // scheduler只有在属性发生变化的时候，才会执行
  let oldValue;
  let newValue;
  const _effect = new ReactiveEffect(source, () => {
    // scheduler执行的时候，属性值已经发生变化，最新值通过run方法获取，等同于source()
    newValue = _effect.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  });
  // watch的时候，首先这里执行一次，收集依赖 ()=>obj.name
  oldValue = _effect.run();
};
```

```ts
function watchReactive(source, cb) {
  for (const key in source) {
    watchFunction( () => source[key], () => { cb(source, source); } );
  }
}
export function watch(source, cb) {
  isFunction(source) && watchFunction(source, cb);
  isReactive(source) && watchReactive(source, cb);
}

```
