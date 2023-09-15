import { ReactiveEffect, activeEffect,trackEffects,triggerEffects } from './effect';
import { isFunction } from './reactive';

export function computed(getterOrSetterOptions) {
  let getter
  let setter
  if (isFunction(getterOrSetterOptions)) {
    getter = getterOrSetterOptions
    setter = () => { console.log('空') }
  } else {
    getter = getterOrSetterOptions.get
    setter = getterOrSetterOptions.set
  }
  return new ComputedRefImpl(getter, setter)
}

export class ComputedRefImpl {
  public __v_isRef = true
  private _value
  private effect
  // dirty是脏的意思，代表是否需要重新计算，true表示需要重新计算
  private _dirty = true
  // computed fullName的话，收集fullName相关的effect
  public dep: Set<ReactiveEffect> = new Set()
  constructor(getter, public setter) {
    this.effect = new ReactiveEffect(getter, () => {
      // 依赖的属性发生变化的时候，会执行这里。属性变化，表明被污染，需要重新计算
      if (!this._dirty) {
        this._dirty = true
      }
    })

  }
  get value() {
    if (this._dirty) {
      this._value = this.effect.run()
      this._dirty = false
    }
    // 读取value的时候，收集effect
    trackEffects(this.dep);

    return this._value
  }
  set value(newVal) {
    if(newVal === this._value){
      return
    }
    this._value = newVal;
    this.setter(newVal);
    // 设置value的时候，触发dep的effect挨个执行
    triggerEffects(this.dep);
  }
}