// activeEffect是当前执行的effect
export let activeEffect = null
// ReactiveEffect是响应式effect实例
// 作用是将fn执行，并且将fn里面的响应式对象收集起来
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
  // 创建一个响应式effect实例，创建这个类最主要是将fn里面的响应式对象收集起来。当然也需要保存fn执行
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
  // targetMap是响应式对象和effect的映射关系。如果没有映射关系，就创建一个，顺手赋值
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 对象和effect有映射关系，就看下有没有这个属性的映射。
  // depsMap是属性和effect的映射关系。如果没有就创建一个，顺手赋值
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  // activeEffect是当前执行的effect。如果属性对应的映射表里面没有这个effect，就存入。
  // activeEffect.deps也存入这个属性对应的映射表
  let shouldTrack = !dep.has(activeEffect)
  if (shouldTrack) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }

}

// 如果修改响应式对象的属性（set里面调用），就会触发响应的effect执行
export function trigger(target, key, newValue, oldValue) {
  // target是响应式对象，targetMap是响应式对象和effect的映射关系，如果没有映射关系，直接返回
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  // 如果有映射关系，找到这个属性对应的effect。depsMap是属性和effect的映射关系
  const dep = depsMap.get(key)
  // 如果没有effect，直接返回
  if (!dep) {
    return
  }
  // 如果有effect，遍历effect，让effect执行
  dep.forEach(effect => {
    // 死循环的问题，如果修改的是当前属性，直接不触发
    // 当前执行的effect如果是activeEffect 就不要执行了
    if (effect !== activeEffect) {
      effect.run()
    }
  })
}

// reactive.ts 38行
// if(oldValue !== value) {
//   trigger(target, key, value, oldValue)
// }