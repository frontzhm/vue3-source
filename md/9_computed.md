---
title: computed的简易版 - 源码系列9
tags: vue
categories: vue
theme: vue-pro
highlight:
---

接着写 computed！

## 目标 computed

首先看下，目标 computed 的功能：

```js
import {
  reactive,
  effect,
  watch,
  watchEffect,
  computed,
} from '../../../node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.js';
// import { reactive, effect,watch,watchEffect } from './reactivity.js';
const obj = reactive({
  firstName: 'hua',
  lastName: ' yan',
});
const fullName = computed({
  get() {
    console.log('getter');
    return obj.firstName + obj.lastName;
  },
  set(newVal) {
    console.log('computed里的set', newVal);
  },
});

obj.firstName = 'hua1';
console.log(fullName);
console.log(fullName.value);
console.log(fullName.value);

const fullName2 = computed(() => {
  console.log('getter2');
  return obj.firstName + obj.lastName;
});
console.log(fullName2);
console.log(fullName2.value);
console.log(fullName2.value);
```

![computed\_1](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9120f521e7814fecb8bd9cb0bb8d43d8~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=1236\&h=363\&s=51691\&e=png\&b=fefefe)

`computed`的应用场景是根据其他数据衍生的，比如说根据 firstName 和 lastName 衍生出 fullName
`computed`的特点是有缓存，只有当依赖的数据发生变化时才会重新计算

## 分析 computed

*   computed 是一个函数，1 个参数，对象或者函数
*   是函数的话，相当于一个 get
*   是对象的话，能有 get 和 set
*   返回值是`ComputedRefImpl`实例

## 写 computed

### 1. 可以正常返回新值

`computed`先分开`getter`和`setter`，然后返回`ComputedRefImpl`实例。
`ComputedRefImpl`实例属性 value 的时候，可以得到值，这里其实直接借用之前的`ReactiveEffect`，根据依赖属性，可以自动执行函数。

在`reactivity/src/computed`下：

```js
import { ReactiveEffect } from './effect';
import { isFunction } from './reactive';

export function computed(getterOrSetterOptions){
  let getter
  let setter
  if (isFunction(getterOrSetterOptions)) {
    getter = getterOrSetterOptions
    setter = ()=>{console.log('空')}
  }else{
    getter = getterOrSetterOptions.get
    setter = getterOrSetterOptions.set
  }
  return new ComputedRefImpl(getter, setter)
}

export class ComputedRefImpl {
  private _value
  private effect
  constructor(getter,setter){
    this.effect = new ReactiveEffect(getter,()=>{})

  }
  get value(){
    this._value = this.effect.run()
    return this._value
  }
}
```

换回自己的，试试!

![computed\_2](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3dee311fcde74a1082d365e9aff2db14~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=637\&h=366\&s=32237\&e=png\&b=fefefe)

值变化，可以拿到新的值。但是，会多次执行依赖函数，没有缓存效果。

### 2. 实现缓存效果

用`_dirty`来标识需不需要重新计算，不需要的话直接返回，就不再执行一次 effect

默认的时候，`_dirty`为 true，执行的时候，设置为 false。
属性变化的时候，将`_dirty`重新为 true。

```js
export class ComputedRefImpl {
  private _value
  private effect
  // dirty是脏的意思，代表是否需要重新计算，true表示需要重新计算
  private _dirty = true
  constructor(getter){
    this.effect = new ReactiveEffect(getter,()=>{
      // 依赖的属性发生变化的时候，会执行这里。属性变化，表明被污染，需要重新计算
      if(!this._dirty){
        this._dirty = true
      }
    })

  }
  get value(){
    if(this._dirty){
      this._value = this.effect.run()
      this._dirty = false
    }
    return this._value
  }
}
```

刷新，试试!

![computed\_3](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ac6df0134ca4d10b0e26ae03ce38dde~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=609\&h=322\&s=31252\&e=png\&b=ffffff)

### 3.处理 setter

index.html 里设置 fullName 的值

```js
fullName.value = '1212';
console.log(fullName.value);
```

刷新下，发现报错了!
![computed\_4](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12623396e95845d1892b3e67923f85ed~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=800\&h=216\&s=30465\&e=png\&b=fffbfb)

因为类只有`get value`，没有`set value`，加上就好啦啦，注意，这里还需要执行下`computed`的传参`setter`

```js
export class ComputedRefImpl {
  // ...
  constructor(getter,public setter){
    //...
  }
  set value(newVal){
    this._value = newVal;
    this.setter(newVal)
  }
}

```

刷新下就好了！

![computed\_5](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a2782bf0d1b54c6e9b24aa33d64be622~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=758\&h=260\&s=28142\&e=png\&b=ffffff)

### 4.对 setter 的监测，收集依赖

但这里引发另外一个问题，`fullName`主动设置值的时候，是没有监测的，举个例子

index.html 里 effect 下 fullName 的值

```js
effect(() => {
  console.log('fullName变化的时候', fullName.value);
});
fullName.value = '1212';
console.log(fullName.value);
```

根本没变化！

最核心需要做两个方面：

1.  读取`fullName`的时候，收集相应`effect`（拿个 Set 放进去）
2.  `fullName`赋值的时候，将收集的`efffec`挨个执行！

步骤：

1.  先用`dep`属性，来收集`effect`
2.  `get value`的时候，如果当前有`effect`运行，那么就把这个 effect 收集到`dep`
3.  `set value`的时候，`dep`容器里`effect`挨个执行

```js
export class ComputedRefImpl {
  // computed fullName的话，收集fullName相关的effect
  public dep:Set<ReactiveEffect> = new Set()
  get value(){

    if(this._dirty){
      this._value = this.effect.run()
      this._dirty = false
    }
    // 读取value的时候，收集effect
    if(activeEffect && !this.dep.has(activeEffect)){
      this.dep.add(activeEffect)
      // effect的dep里面也要收集computed的dep
      activeEffect.deps.push(this.dep)
    }
    return this._value
  }
  set value(newVal){
    this._value = newVal;
    this.setter(newVal);
    // 设置value的时候，触发dep的effect挨个执行
    this.dep.forEach(effect => {
      if(effect!==activeEffect){
        effect.scheduler?effect.scheduler():effect.run();
      }
    });
  }
}
```

刷新下，可以啦！
![computed\_6](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7987d60ee5b4493c87b8518f57f17376~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=813\&h=353\&s=57892\&e=png\&b=fefcfc)

### 5.优化

effect 和 computed，收集和触发的逻辑是一致的，代码是尽量避开重复的，所以这里将收集和触发抽离出来。

![computed\_7](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/36980699c05a4011b694771a998b8af4~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2466\&h=1002\&s=383786\&e=png\&b=242424)
![computed\_8](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3267090048344d879e2614b22400af64~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2416\&h=1390\&s=527073\&e=png\&b=242424)

```ts
/**
 * dep收集effect
 */
export function trackEffects(dep: Set<ReactiveEffect>) {
  if (activeEffect && !dep.has(activeEffect)) {
    // 收集effect
    dep.add(activeEffect);
    // effect同样收集下dep
    activeEffect.deps.push(dep);
  }
}
/**
 * dep执行触发effect
 */
export function triggerEffects(dep: Set<ReactiveEffect>) {
  // 防止死循环，所以这边浅拷贝
  [...dep].forEach((effect) => {
    const isRunning = activeEffect === effect;
    if (!isRunning) {
      effect.scheduler ? effect.scheduler() : effect.run();
    }
  });
}
```

同时调整`computed`和`effect`，刷新下页面，还是没问题滴！

## 将 reactivty 文件夹具体代码展示

### index.ts

```ts
export * from './reactive';
export * from './effect';
export * from './apiWatch';
export * from './computed';
```

### reactive.ts

```ts
// import { isObject } from './shared'
import { track, trigger } from './effect';
export const isObject = (param) => {
  return typeof param === 'object' && param !== null;
};
export const isFunction = (param) => {
  return typeof param === 'function';
};
const __v_isReactive = '__v_isReactive';
// 是不是响应式对象
export const isReactive = (param) => param[__v_isReactive];

// 代理对象的映射
export const reactiveMap = new WeakMap();

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
  if (target[__v_isReactive]) {
    return target;
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 这里埋点，加上__v_isReactive属性，标识已经代理过了
      if (key === __v_isReactive) {
        return true;
      }
      // Reflect将target的get方法里的this指向proxy上，也就是receiver
      const res = Reflect.get(target, key, receiver);
      // 依赖收集
      track(target, key);
      // 如果是对象，递归代理
      if (isObject(res)) {
        return reactive(res);
      }
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

### effect.ts

```ts
// track的时候，需要拿到effect，所以用下全局变量存放effect
export let activeEffect: ReactiveEffect | null = null;
// 建立类，方便存放fn，和运行
/**
 * fn是函数，收集属性依赖，scheduler是函数，属性依赖变化的时候，执行
 * 属性deps是个二维数组，结构是 [[_effect1,_effect2],[_effect3,_effect2],]
 */
export class ReactiveEffect {
  // 是否主动执行
  private active = true;
  // 新增deps
  deps = [];
  parent;
  constructor(private fn, public scheduler) {}

  run() {
    if (!this.active) {
      const res = this.fn();
      // 这里watch的时候，fn是函数返回字段，需要返回值
      return res;
    }

    this.parent = activeEffect;
    activeEffect = this;
    // 运行之前，清除依赖
    clearupEffect(this);
    const res = this.fn();
    activeEffect = this.parent;
    this.parent && (this.parent = null);
    return res;
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
  const deps = _effect.deps;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(_effect);
  }
  // 同时deps置空，保证每次effect运行都是新的属性映射
  _effect.deps.length = 0;
}

// }
export function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, options?.scheduler);
  _effect.run();
  // runner是个函数，等同于_effect.run，注意绑定this
  const runner = _effect.run.bind(_effect);
  // runner还有effect属性，直接赋值就好
  runner.effect = _effect;
  return runner;
}

// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
export const targetMap: WeakMap<
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
  trackEffects(dep);
  // 这属性track过了
  // if (dep.has(activeEffect)) {
  //   return;
  // }
  // // 核心代码，属性 订阅 effect （本质就是建立映射关系），上面一坨就是判断加初始化
  // dep.add(activeEffect);
  // // 新增deps
  // activeEffect.deps.push(dep);
}

/**
 * dep收集effect
 */
export function trackEffects(dep: Set<ReactiveEffect>) {
  if (activeEffect && !dep.has(activeEffect)) {
    // 收集effect
    dep.add(activeEffect);
    // effect同样收集下dep
    activeEffect.deps.push(dep);
  }
}
/**
 * dep执行触发effect
 */
export function triggerEffects(dep: Set<ReactiveEffect>) {
  [...dep].forEach((effect) => {
    const isRunning = activeEffect === effect;
    if (!isRunning) {
      effect.scheduler ? effect.scheduler() : effect.run();
    }
  });
}

// 属性值变化的时候，让相应的effect执行
export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  // 触发执行
  triggerEffects(dep);
}
```

### apiWatch.ts

```ts
import { ReactiveEffect } from './effect';
import { isReactive, isFunction } from './reactive';
// watch字段，提取成一个函数
function watchFunction(source, cb) {
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
}

function watchReactive(source, cb) {
  // TODO 循环引用没看明白 之后再补吧
  for (const key in source) {
    watchFunction(
      () => source[key],
      () => {
        cb(source, source);
      }
    );
  }
}

export function watchEffect(cb) {
  const _effect = new ReactiveEffect(cb, null);
  _effect.run();
}
export function watch(source, cb) {
  isFunction(source) && watchFunction(source, cb);
  isReactive(source) && watchReactive(source, cb);
}
```

### computed.ts

```ts
import {
  ReactiveEffect,
  activeEffect,
  trackEffects,
  triggerEffects,
} from './effect';
import { isFunction } from './reactive';

export function computed(getterOrSetterOptions) {
  let getter;
  let setter;
  if (isFunction(getterOrSetterOptions)) {
    getter = getterOrSetterOptions;
    setter = () => {
      console.log('空');
    };
  } else {
    getter = getterOrSetterOptions.get;
    setter = getterOrSetterOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

export class ComputedRefImpl {
  private _value;
  private effect;
  // dirty是脏的意思，代表是否需要重新计算，true表示需要重新计算
  private _dirty = true;
  // computed fullName的话，收集fullName相关的effect
  public dep: Set<ReactiveEffect> = new Set();
  constructor(getter, public setter) {
    this.effect = new ReactiveEffect(getter, () => {
      // 依赖的属性发生变化的时候，会执行这里。属性变化，表明被污染，需要重新计算
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  get value() {
    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false;
    }
    // 读取value的时候，收集effect
    trackEffects(this.dep);

    return this._value;
  }
  set value(newVal) {
    if (newVal === this._value) {
      return;
    }
    this._value = newVal;
    this.setter(newVal);
    // 设置value的时候，触发dep的effect挨个执行
    triggerEffects(this.dep);
  }
}
```
