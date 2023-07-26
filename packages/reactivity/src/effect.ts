export let activeEffect = null
export class ReactiveEffect {
  // 默认将fn挂到实例上
  constructor(private fn) { }
  parent = null
  // 响应式effect实例依赖哪些属性
  deps = []
  run() {

    try {
      this.parent = activeEffect;
      activeEffect = this;
      return this.fn();
    } finally {
      activeEffect = this.parent
      this.parent = null
    }
  }
}
export function effect(fn: () => {}) {
  // 创建一个响应式effect实例，并且让fn执行
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

const targetMap = new WeakMap()

// target是响应式对象，key是对象的key
// 这个函数的作用是将effect存入targetMap中
export function track(target, key) {
  if (activeEffect === null) {
    return
  }
  // 让这个对象上的属性，记录当前的activeEffect
  // targetMap是一个WeakMap，key是target，value是depsMap
  // 说明用户是在effect使用的这个数据
  let depsMap = targetMap.get(target)
  // depsMap是一个Map，key是key，value是Set。Set里面存放的是effect
  // 如果没有创建映射表就创建一个
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 有映射表就看下有没有这个属性的映射
  let dep = depsMap.get(key)
  // dep是一个Set，里面存放的是effect
  // 如果没有就创建一个
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  let shouldTrack = !dep.has(activeEffect)
  // 如果有就看下set里面有没有这个effect
  // 这里埋点，将effect存入Set
  if (shouldTrack) {
    dep.add(activeEffect)
    // 添加
    // 添加
    // 添加
    activeEffect.deps.push(dep)
  }

}

export function trigger(target, key, newValue, oldValue) {
  // 通过对象找到对应的属性，让属性对应的effect执行
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const dep = depsMap.get(key)
  dep &&
    dep.forEach(effect => {
      // 死循环的问题，如果修改的是当前属性，直接不触发
      // 当前执行的effect如果是activeEffect 就不要执行了
      if(effect !== activeEffect){
        effect.run()
      }
    })
}

// reactive.ts 38行
// if(oldValue !== value) {
//   trigger(target, key, value, oldValue)
// }