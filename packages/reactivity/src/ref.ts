import { ReactiveEffect,trackEffects,triggerEffects } from './effect';

import {isObject,reactive} from './reactive'
export function ref(param){
  return new RefImpl(param)
}

function toReactive(param){
  return isObject(param)?reactive(param):param
}

export class RefImpl{
  private _value
  public dep: Set<ReactiveEffect> = new Set()
  constructor(private rawValue){
    this._value = toReactive(rawValue)
  }
  get value(){
    trackEffects(this.dep);
    return this._value
  }
  set value(newVal){
    if(newVal===this._value){
      return
    }
    this._value = toReactive(newVal);
    triggerEffects(this.dep);
  }
}