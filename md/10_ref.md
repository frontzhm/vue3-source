---
title: ref的简易版 - 源码系列9
tags: vue
categories: vue
theme: vue-pro
highlight:
---

接着写 ref！

## 目标 ref

首先看下，目标 ref 的功能：

```js
import {
        reactive,
        effect,
        watch,
        watchEffect,
        computed,
        ref
      } from '../../../node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.js';
      // import { reactive, effect,watch,watchEffect, computed } from './reactivity.js';
      
      const name = ref('颜酱');
      const obj = ref({name:'颜酱 对象'})
      effect(()=>{
        console.log('effect name.value',name.value)
      })
      effect(()=>{
        console.log('effect name',name)
      })
      effect(()=>{
        console.log('effect obj.value',obj.value)
      })
      effect(()=>{
        console.log('effect obj',obj)
      })
      
      obj.value.name = '颜酱3 对象'
      name.value = '颜酱 普通'

```
![ref_1](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/ref_1.png)

`ref`一般是监测普通类型的值。

## 分析 ref

*  ref 是一个函数，1 个参数，对象或者普通类型的值
*  返回值是`RefImpl`实例
*  获取值，通过`.value`，修改值，也是同理
*  值变化的时候，触发相应的`effect`
*  如果`ref`对象的话，值会变成`proxy`



## 写 ref

ref的逻辑和`computed`极其相似，取值改值都是通过value属性。

获取值的时候，收集effect
修改值的时候，触发effect

```ts
import { ReactiveEffect,trackEffects,triggerEffects } from './effect';

export function ref(param){
  return new RefImpl(param)
}

export class RefImpl{
  private _value
  public dep: Set<ReactiveEffect> = new Set()
  constructor(private rawValue){
    this._value = rawValue
  }
  get value(){
    trackEffects(this.dep);
    return this._value
  }
  set value(newVal){
    if(newVal===this._value){
      return
    }
    this._value = newVal;
    triggerEffects(this.dep);
  }
}
```

### 对象进行特殊处理

对象的时候，需要进行`proxy`

```ts
import {isObject,reactive} from './reactive'
function toReactive(param){
  return isObject(param)?reactive(param):param
}
export class RefImpl{
  constructor(private rawValue){
    this._value = toReactive(rawValue)
  }
  set value(newVal){
    // ...
    this._value = toReactive(newVal);
    // ...
  }
}
```

刷新下就可以了！

![ref_2](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/ref_2.png)


### 设置__v_isRef

这里有种情况，额外处理下，`index.html`加两句

```js
const obj2 = reactive({person:obj,age:18})
console.log('obj2 reactive ref',obj2.person)
```
如果按照现在的逻辑，应该是`ref类型`，但引用原vue发现结果是这样

![ref_4](https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/ref_4.png)

也就是reactive对象里，如果key值是对象，且被ref过的话，将直接返回Proxy类型，并不会返回ref类型。

怎么处理呢？

1. ref类用属性`public __v_isRef = true`，标识自己
2. reactive里get取值时，如果发现`__v_isRef = true`，则返回`xx.value`就可以

```ts
// ref.ts
export class RefImpl{
  public __v_isRef = true
  // ...
}

// computed.ts 这边顺手加上
export class ComputedRefImpl {
  public __v_isRef = true
}

// reactive.ts
export function reactive(target) {
  // ...
  if (target[__v_isReactive]) {
    return target
  }
  // 如果是ref对象，直接返回value
  if (target.__v_isRef) {
    return target.value
  }
}
```
然后再换成自己的，就可以返回Proxy值了！

## ref.ts

```ts
import { ReactiveEffect,trackEffects,triggerEffects } from './effect';

import {isObject,reactive} from './reactive'
export function ref(param){
  return new RefImpl(param)
}

function toReactive(param){
  return isObject(param)?reactive(param):param
}

export class RefImpl{
  public __v_isRef = true
  private _value
  public dep: Set<ReactiveEffect> = new Set()
  constructor(private rawValue){
    this._value = toReactive(rawValue)
  }
  get value(){
    trackEffects(this.dep);
    return this._value
  }
  set value(newVal){
    if(newVal===this._value){
      return
    }
    this._value = toReactive(newVal);
    triggerEffects(this.dep);
  }
}
```
