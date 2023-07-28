---
title: effect依赖清理流程 - 源码系列4
tags: vue
categories: vue
theme: vue-pro
highlight:
---

上次写完简单版的 effect，监测的属性发生变化，相应的 effect 就会自动执行。

本文进阶版，effect 里面的依赖属性，可能每次调用的之后都不一样，需要清理和重新收集。

## 目标 effect

先看 effect 的每次执行，依赖属性发生变化的情况

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
  who: 'age',
});

effect(() => {
  // obj.who是age的时候，依赖属性是who和age
  obj.who === 'age'
    ? console.log('effect', obj.age)
    : console.log('effect', obj.name);
});
// 此时effect的依赖属性是who和age
obj.age = '22';
obj.name = 'name发生变化1';
console.log(
  '这行执行的时候，还看不到name的变化，因为effect函数没执行，所以看不到打印'
);
// 此时effect的依赖属性是who和name
obj.who = 'name'; // 这里因为改变who，执行了一次effect
// age再变化就不执行effect了
obj.age = '23';
```

![effect_2](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_2.png)

之前，effect 只在首次执行的时候，我们进行了收集，之后并没有再继续收集

用回我们自己的是这样

![effect_4](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_4.png)

我们分析下：

- 首次执行 effect 的时候，依赖关系应该是：`{obj:{who:[_effect],age:[_effect]}}`
- `obj.age = '22'`之后，直接\_effect 执行
- `obj.name = 'name发生变化1';`之后，因为映射里并没有 name，故\_effect 不会执行
- `obj.who = 'name'`之后，映射里有 who，所以\_effect 执行，此时依赖关系将增加`name`，但没有删除`age`，所以会变成`{obj:{who:[_effect],age:[_effect],name:[_effect]}}`
- `obj.age = '23'`之后，因为 age 的映射没有删除，依然会执行\_effect

## 分析 effect

上一次的依赖关系，会影响下一次的依赖收集。

比较好的办法就是，执行 effect 之前，先**清除**掉该 effect 的依赖关系，执行 effect 的时候，track 会再次收集，这样就能保证，依赖关系是最新的。（跟生成 dist 目录很像，每次生成之后，先清除掉之前的，以免影响当次）

问题的核心来了：怎么**清除**掉该 effect 的依赖关系，换言之，怎么将属性对应的该 effect 从映射里删除呢？

解决办法：建立映射的时候，假设新增\_effect2，如`{name:[_effect1,_effect2,]}`，那么同时将`[_effect1,_effect2]`这个数组添加到`_effect2`实例的属性 deps 上，deps 变成`[[_effect1,_effect2],]`，当`_effect2`下次执行的时候，遍历 deps，遍历到`[_effect1,_effect2]`就会将\_effect2 移除，因为数组是引用关系，自然映射关系也就变成`{name:[_effect1]}`了。

说白了，就是每个\_effect 实例，都会存一份有自己的数组 deps，`run`的时候，从 deps 遍历，从而将属性对应的自己，挨个删除。

## 开写

先写移除逻辑

```js
function clearEffect(_effect) {
  // deps结构是 [[_effect1,_effect2],[_effect3,_effect2],]，假设去掉_effect2
  _effect.deps.forEach((dep) => {
    for (let i; i < dep.length; i++) {
      if (dep[i] === _effect) {
        dep.delete(_effect);
      }
    }
  });
  // 同时deps置空，保证每次effect运行都是新的属性映射
  _effect.deps.length = 0;
}
```

运行之前，清除掉依赖

```js
class ReactiveEffect {
  // 新增deps
  public deps = []
  //  ...

  run() {
    // 运行之前，清除依赖
    clearEffect(this);
    // ...
  }

}
```

别忘了，track 的时候，deps 属性也需要添加 dep

```js
// 让属性 订阅 和自己相关的effect，建立映射关系
export function track(target, key) {
  // ...
  // 这里添加！
  activeEffect.deps.push(dep);
}
```

`index.html`里重新换成自己的路径，发现可以了~

![effect_2](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/effect_2.png)

## 附上 effect 完整代码

```ts
// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，方便存放fn，和运行
class ReactiveEffect {
  // 新增deps
  public deps = [];
  private fn;
  private parent;

  constructor(fn) {
    this.fn = fn;
  }

  run() {
    // 运行之前，清除依赖
    clearEffect(this);
    this.parent = activeEffect;
    activeEffect = this;
    this.fn();
    activeEffect = this.parent;
    this.parent && (this.parent = null);
  }
}
function clearEffect(_effect) {
  // deps结构是 [[_effect1,_effect2],[_effect3,_effect2],]，假设去掉_effect2
  _effect.deps.forEach((dep) => {
    for (let i; i < dep.length; i++) {
      if (dep[i] === _effect) {
        dep.delete(_effect);
      }
    }
  });
  // 同时deps置空，保证每次effect运行都是新的属性映射
  _effect.deps.length = 0;
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
  // 新增deps
  activeEffect.deps.push(dep);
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
