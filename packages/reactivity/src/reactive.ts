export const isObject = (param) => {
  return typeof param === 'object' && param !== null
}
export function reactive(target) {
  // 如果不是对象，直接返回
  if (!isObject(target)) {
    return
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      console.log('get', key)
      return target[key]
    },
    set(target, key, value, receiver) {
      console.log('set', key, value)
      target[key] = value
      return true
    }
  })
  return proxy
}