// import { isObject } from './shared'
import { track, trigger } from './effect';
export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}

// 代理对象的映射
const reactiveMap = new WeakMap()

export function reactive(target) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return
  }

  // 如果已经代理过了，直接返回
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }

  // 如果已经代理过了，__v_isReactive肯定是true，那直接返回
  if (target.__v_isReactive) {
    return target
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 这里埋点，加上__v_isReactive属性，标识已经代理过了
      if (key === '__v_isReactive') {
        return true
      }
      // Reflect将target的get方法里的this指向proxy上，也就是receiver
      const res = Reflect.get(target, key, receiver);
      // 依赖收集
      track(target, key)
      // 如果是对象，递归代理
      if(isObject(res)) {
        return reactive(res)
      }
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const r = Reflect.set(target, key, value, receiver);
      // 响应式对象发生变化的时候，触发effect执行
      if(oldValue !== value) {
        trigger(target, key)
      }
      return r;
    },
  })
  // 如果没有代理过，缓存映射
  reactiveMap.set(target, proxy)
  return proxy
}