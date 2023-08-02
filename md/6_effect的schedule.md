---
title: effect的scheduler - 源码系列6
tags: vue
categories: vue
theme: vue-pro
highlight:
---

effect最后一节，scheduler！

## 目标 ：带有schedule的effect

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
      const runner = effect(
        () => {
          console.log('effect', obj.name);
        },
        {
          scheduler: () => {
            console.log('scheduler');
          },
        }
      );
      // 修改的时候 只触发scheduler
      obj.name = 'dd';
      obj.name = 'dddd';
```

![effect_6](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_6.png)

## 继续分析 effect

- effect的第二个参数，选项参数，传入的scheduler是个函数
- 首次依然执行fn，但是之后属性改变，执行的是scheduler

加scheduler:

```ts
// effect.ts
export function effect(fn,options) {
  const _effect = new ReactiveEffect(fn,options?.scheduler);
  // ...
}
class ReactiveEffect {
  constructor(private fn, public scheduler) {}
  // ...
}
```

属性改变，有scheduler执行scheduler，没有执行run

```ts
export function trigger(target, key) {
  // ...
  activeEffect !== effect && (effect.scheduler ? effect.scheduler() : effect.run());
}
```



