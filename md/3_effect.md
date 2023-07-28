---
title: 实现effect - 源码系列3
tags: vue
categories: vue
theme: vue-pro
highlight:
---

写 effect 啦！

## 目标 effect

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

每次 effect 里相关的响应式对象发生变化，effect 就会执行一次。

## 分析目标 effect

- effect 本身是一个函数，输入是一个函数，暂时可以没输出
- effect 执行，参数 fn 执行
- effect 里相应的属性发生变化，参数 fn 再次执行

## effect 函数首次执行

```ts
export function effect(fn) {
  fn();
}
```

## effect 里相应的属性发生变化，参数 fn 再次执行

变化 => 执行，典型的观察者模式，需要建立属性和 effect 的订阅和触发关系。

先订阅。
首次执行函数的时候，会读到属性（get），将这些属性和 effect 对应起来。

然后变化，执行。  
属性发生改变（set），对应的 effect 执行。

## 使用 track 和 trigger

reactive.js 那里，track 和 trigger 添加。这是大逻辑

```ts
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    // ...
    const res = Reflect.get(target, key, receiver);
    // effect首次执行时，收集effect相关的属性
    track(target, key);
    return res;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    const r = Reflect.set(target, key, value, receiver);
    // 属性值发生变化的时候，触发相关的effect执行
    if (oldValue !== value) {
      trigger(target, key);
    }
    return r;
  },
});
```

## 建立 track 和 trigger 的函数

track 主要是建立属性和 effect 的映射关系，trigger 是找到属性对应的 effect，挨个执行。
全局变量 activeEffect 和 targetMap 辅助这两方法实现。
ReactiveEffect 类同样也是辅助，建立类的好处是方便加其他属性和逻辑。

先看下 ReactiveEffect 类

```js
// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，除了存放fn，方便处理其他逻辑
class ReactiveEffect {
  private fn
  constructor(fn) {
    this.fn = fn;
  }
  run() {
    // 运行的时候，当前的effect赋值给全局，让track的时候，方便属性订阅
    activeEffect = this;
    console.log('activeEffect', activeEffect)
    this.fn();
    // 运行完，释放
    activeEffect = null;
  }
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}
```

看下 track

```js
// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
const targetMap = new WeakMap();

// 让属性 订阅 和自己相关的effect（建立映射关系）
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
}
```

看下 trigger

```js
// 属性值变化的时候，让相应的effect执行
export function trigger(target, key) {
  console.log('targetMap', targetMap);
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  // 核心代码  属性相应的effect 挨个执行（上面一坨也是一样，判断）
  dep.forEach((effect) => {
    effect.run();
  });
}
```

index.html 里换成自己的文件试试，`import { reactive } from './reactivity.js';`
![effect_1](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13ac714d9b464ee1b11d9fb237daabb3~tplv-k3u1fbpfcp-zoom-1.image)

整个逻辑就是，effect 首次执行的时候，触发 get，然后建立属性和 effect 的映射关系，属性值变化的时候，触发 set，然后寻找到映射的 effect，让其再执行。

## effect 嵌套关系处理

将 index.html 里，加上嵌套 effect

```js
effect(() => {
  console.log('effect', state.age);
  effect(() => {
    console.log('effect2', state.name);
  });
});
```

其实嵌套 effect，表示关系主要是通过 parent 属性

```js
run() {
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
```

## effect 死循环处理

如果相关的属性在内部发生变化，就会引起 effect 死循环了！

```js
effect(() => {
  state.age++;
  console.log('effect', state.age);
});
```

解决方式就是，属性值发生变化，触发相应的 effect，但是如果正好当前执行的 effect 就是马上要执行的 effect，那么不执行就好

```js
dep.forEach((effect) => {
  activeEffect !== effect && effect.run();
});
```

刷新下浏览器，发现就不死循环啦！

## 完整版的简单版 effect 文件和 reactivity 文件

effect 文件：

```ts
// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，方便存放fn，和运行
class ReactiveEffect {
  private fn;
  private parent;
  constructor(fn) {
    this.fn = fn;
  }
  run() {
    // 通常是嵌套的effect，所以需要保存父级effect
    // 如果没有嵌套关系，那么这里的activeEffect肯定是null
    // 有的话，说明上一个effect没执行完，所以这里有上一个effect的引用
    this.parent = activeEffect;
    // 重新将新的effect赋值给全局变量
    activeEffect = this;
    // 执行
    this.fn();
    // 执行完之后，将全局变量恢复成上一个effect，没有的话就是null
    activeEffect = this.parent;
    // 如果有父级的话 将父级effect置空
    this.parent && (this.parent = null);
  }
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}

// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
const targetMap: WeakMap<
  object,
  Map<string, Set<ReactiveEffect>>
> = new WeakMap();

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
}

// 属性值变化的时候，让相应的effect执行
export function trigger(target, key) {
  console.log('targetMap', targetMap);
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  // 核心代码  属性相应的effect 挨个执行（上面一坨也是一样，判断）
  dep.forEach((effect) => {
    activeEffect !== effect && effect.run();
  });
}
```

reactivity 文件：

```ts
// import { isObject } from './shared'
import { track, trigger } from './effect';
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};

// 代理对象的映射
const reactiveMap = new WeakMap();

export function reactive(target) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return;
  }

  // 如果已经代理过了，直接返回
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }

  // 如果已经代理过了，__v_isReactive肯定是true，那直接返回
  if (target.__v_isReactive) {
    return target;
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      console.log('读取key', key);
      // 这里埋点，加上__v_isReactive属性，标识已经代理过了
      if (key === '__v_isReactive') {
        return true;
      }
      // Reflect将target的get方法里的this指向proxy上，也就是receiver
      const res = Reflect.get(target, key, receiver);
      // 依赖收集
      track(target, key);
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const r = Reflect.set(target, key, value, receiver);
      // 响应式对象发生变化的时候，触发effect执行
      if (oldValue !== value) {
        trigger(target, key);
      }
      return r;
    },
  });
  // 如果没有代理过，缓存映射
  reactiveMap.set(target, proxy);
  return proxy;
}
```

index 文件

```ts
export * from './reactive';
export * from './effect';
```
