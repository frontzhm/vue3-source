// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，方便存放fn，和运行
class ReactiveEffect {
  private fn
  private parent
  constructor(fn) {
    this.fn = fn;
  }
  run() {
    // 通常是嵌套的effect，所以需要保存父级effect
    // 如果没有嵌套关系，那么这里的activeEffect肯定是null
    // 有的话，说明上一个effect没执行完，所以这里有上一个effect的引用
    this.parent = activeEffect
    // 重新将新的effect赋值给全局变量
    activeEffect = this;
    // 执行
    this.fn();
    // 执行完之后，将全局变量恢复成上一个effect，没有的话就是null
    activeEffect = this.parent
    // 如果有父级的话 将父级effect置空
    this.parent && (this.parent = null);
  }
}

export function effect(fn) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}

// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
const targetMap = new WeakMap();

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
}

// 属性值变化的时候，让相应的effect执行
export function trigger(target, key) {
  console.log('targetMap', targetMap)
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
    effect.run();
  });
}
