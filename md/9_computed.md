---
title: computed的简易版 - 源码系列9
tags: vue
categories: vue
theme: vue-pro
highlight:
---

接着写computed！

## 目标 computed

      /**
       * computed的应用场景是根据其他数据衍生的，比如说根据firstName和lastName衍生出fullName
       * computed的特点是有缓存，只有当依赖的数据发生变化时才会重新计算
       * computed的实现原理是利用了effect的特点，effect会收集依赖，当依赖发生变化时会重新执行
       * computed的getter就是一个effect，当依赖的数据发生变化时，会重新执行getter，重新收集依赖
       * computed的setter就是一个effect，当computed的值发生变化时，会执行setter，setter中会触发trigger，触发computed的effect
       * computed的缓存是通过dirty来实现的，当依赖的数据发生变化时，会将dirty设置为true，当getter执行时，会重新计算，计算完毕后会将dirty设置为false
       * 当computed的值发生变化时，会将dirty设置为true，当getter执行时，会重新计算，计算完毕后会将dirty设置为false
       * 当依赖的数据发生变化时，会触发trigger，触发computed的effect，effect执行时会判断dirty是否为true，如果为true，会重新计算，计算完毕后会将dirty设置为false
       * 当computed的值发生变化时，会触发trigger，触发computed的effect，effect执行时会判断dirty是否为true，如果为true，会重新计算，计算完毕后会将dirty设置为false
       * 
       */


首先看下，目标 computed 的功能：

```js
import {
        reactive,
        effect,
        watch,
        watchEffect,
        computed
      } from '../../../node_modules/@vue/runtime-dom/dist/runtime-dom.esm-browser.js';
      // import { reactive, effect,watch,watchEffect } from './reactivity.js';
      const obj = reactive({
        firstName: 'hua',
        lastName: ' yan',
      });
      const fullName = computed({
        get(){
          console.log('getter')
          return obj.firstName + obj.lastName
        },
        set(newVal){
          console.log(newVal)
        }
      })
      
      obj.firstName = 'hua1'
      console.log(fullName)
      console.log(fullName.value)
      console.log(fullName.value)

      const fullName2 = computed(() => {
        console.log('getter2')
        return obj.firstName + obj.lastName
      })
      console.log(fullName2)
      console.log(fullName2.value)
      console.log(fullName2.value)  
```

![computed_1]( https://blog-huahua.oss-cn-beijing.aliyuncs.com/blog/code/computed_1.png)

`computed`的应用场景是根据其他数据衍生的，比如说根据firstName和lastName衍生出fullName
`computed`的特点是有缓存，只有当依赖的数据发生变化时才会重新计算


## 分析 computed

* computed 是一个函数，1个参数，对象或者函数
* 是函数的话，相当于一个get
* 是对象的话，能有get和set
* 返回值是`ComputedRefImpl`实例


## 写 computed

### 1. 可以正常返回新值

`computed`先分开`getter`和`setter`，然后返回`ComputedRefImpl`实例。
`ComputedRefImpl`实例属性value的时候，可以得到值，这里其实直接借用之前的`ReactiveEffect`，根据依赖属性，可以自动执行函数。

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

换回自己的，就可以了！

## 清除上一次的watch

有一种需求，某个值发生变化时触发请求，但是新一轮的请求如果迟于上一轮的请求回来，就会出现上一轮的请求覆盖了新一轮的，那么怎么清除上一次的请求呢。


