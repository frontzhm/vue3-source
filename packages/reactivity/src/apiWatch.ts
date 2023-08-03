import { ReactiveEffect } from './effect';
import { isReactive, isFunction } from './reactive';
// watch字段，提取成一个函数
function watchFunction(source, cb) {
  // source是函数-返回字段，()=>obj.name，就是fn直接执行，收集属性
  // scheduler只有在属性发生变化的时候，才会执行
  let oldValue;
  let newValue;
  const _effect = new ReactiveEffect(source, () => {
    // scheduler执行的时候，属性值已经发生变化，最新值通过run方法获取，等同于source()
    newValue = _effect.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  });
  // watch的时候，首先这里执行一次，收集依赖 ()=>obj.name
  oldValue = _effect.run();
};

function watchReactive(source, cb) {
  // TODO 循环引用没看明白 之后再补吧
  for (const key in source) {
    watchFunction(() => source[key], () => { cb(source, source); });
  }
}

export function watch(source, cb) {
  isFunction(source) && watchFunction(source, cb);
  isReactive(source) && watchReactive(source, cb);
}