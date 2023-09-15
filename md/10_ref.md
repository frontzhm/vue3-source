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
