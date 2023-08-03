// track的时候，需要拿到effect，所以用下全局变量存放effect
let activeEffect = null;
// 建立类，方便存放fn，和运行
export class ReactiveEffect {
  // 是否主动执行
  private active = true
  // 新增deps
  deps = []
  parent
  constructor(private fn, public scheduler) {
  }

  run() {
    if (!this.active) {
      const res = this.fn()
      // 这里watch的时候，fn是函数返回字段，需要返回值
      return res;
    }

    this.parent = activeEffect
    activeEffect = this;
    // 运行之前，清除依赖
    clearupEffect(this);
    const res = this.fn();
    activeEffect = this.parent
    this.parent && (this.parent = null);
    return res
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
  const deps = _effect.deps
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(_effect)
  }
  // 同时deps置空，保证每次effect运行都是新的属性映射
  _effect.deps.length = 0
}



// }
export function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, options?.scheduler);
  _effect.run();
  // runner是个函数，等同于_effect.run，注意绑定this
  const runner = _effect.run.bind(_effect)
  // runner还有effect属性，直接赋值就好
  runner.effect = _effect
  return runner
}

// 本质是找到属性对应的effect，但属性存在于对象里，所以两层映射
// 响应性对象 和 effect的映射，对象属性和effect的映射
// targetMap = { obj:{name:[effect],age:[effect]} }
const targetMap: WeakMap<object, Map<string, Set<ReactiveEffect>>> = new WeakMap();

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
  // 新增deps
  activeEffect.deps.push(dep);
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
  // 注意，这里要浅拷贝，不然set删除effect的时候，就死循环了
  [...dep].forEach((effect) => {
    // 这里是出现死循环的根本原因，一边遍历dep的effect，一边执行，而执行的时候，又在删除这里的effect，所以死循环
    activeEffect !== effect && (effect.scheduler ? effect.scheduler() : effect.run());
  });
}
