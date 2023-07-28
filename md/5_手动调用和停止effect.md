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
  active = true;
  run() {
    // 如果不是主动执行，那么只是执行函数，不再赋值activeEffect，就不会触发track，track的第一行判断条件就是，没有activeEffect，直接return。
    if (!this.active) {
      this.fn();
      return;
    }
    // 运行之前，清除依赖
    clearupEffect(this);
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

`index.html`换成自己的文件，发现浏览器挂了

这边注意，进入死循环了！

触发时会进行清理操作（清理 effect），在重新进行收集（收集 effect）。在循环过程中会导致死循环。

```ts
let effect = () => {};
let s = new Set([effect]);
s.forEach((item) => {
  s.delete(effect);
  s.add(effect);
}); // 这样就导致死循环了
```

所以trigger的时候，需要浅拷贝下

```js
export function trigger(target, key) {
  // ....
  // 这里浅拷贝一份执行，这样删了之后，在执行就不会死循环了
  [...dep].forEach((effect) => {
    activeEffect !== effect && effect.run();
  });
}
```

重新刷新下，就可啦！！！

## 附上完整effect代码


```ts
// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，方便存放fn，和运行
class ReactiveEffect {
  // 是否主动执行
  private active = true
  // 新增deps
  deps = []
  fn
  parent
  constructor(fn) {
    this.fn = fn;

  }

  run() {
    if (!this.active) {
      this.fn()
      return;
    }
    
    this.parent = activeEffect
    activeEffect = this;
    // 运行之前，清除依赖
    clearupEffect(this);
    this.fn();
    activeEffect = this.parent
    this.parent && (this.parent = null);
  }
  stop() {
    if (this.active) {
      // 清除依赖
      clearupEffect(this);
      // 标记不主动执行
      this.active = false;
      
    }
  }



}

// 清除依賴
function clearupEffect(_effect) {
  // deps结构是 [[_effect1,_effect2],[_effect3,_effect2],]，假设去掉_effect2
  const deps = _effect.deps
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(_effect)
  }
  // 同时deps置空，保证每次effect运行都是新的属性映射
  _effect.deps.length = 0
}
  


// }
export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  // runner是个函数，等同于_effect.run，注意绑定this
  const runner = _effect.run.bind(_effect)
  // runner还有effect属性，直接赋值就好
  runner.effect = _effect
  return runner
}

// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
const targetMap: WeakMap<object, Map<string, Set<ReactiveEffect>>> = new WeakMap();

// 让属性 订阅 和自己相关的effect，建立映射关系
export function track(target, key) {
  if (!activeEffect) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  // 这属性track过了
  if (dep.has(activeEffect)) {
    return;
  }
  // 核心代码，属性 订阅 effect （本质就是建立映射关系），上面一坨就是判断加初始化
  dep.add(activeEffect);
  // 新增deps
  activeEffect.deps.push(dep);
}

// 属性值变化的时候，让相应的effect执行
export function trigger(target, key) {
  console.log('targetMap', targetMap)
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }

  // 核心代码  属性相应的effect 挨个执行（上面一坨也是一样，判断）
  // 注意，这里要浅拷贝，不然set删除effect的时候，就死循环了
  [...dep].forEach((effect) => {
    activeEffect !== effect && effect.run();
  });
}

```