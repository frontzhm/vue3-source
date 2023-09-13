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