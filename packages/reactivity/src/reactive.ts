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
      console.log('读取key', key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      Reflect.set(target, key, value, receiver);
      return true;
    },
  })
  return proxy
}