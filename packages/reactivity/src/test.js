let person = {
  name: 'hua',
  get aliasName() {
    console.log(this)
    return `alias-${this.name}`
  }
}
let proxy = new Proxy(person, {
  get(target, key, receiver) {
    console.log('读取key',key)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver)
    return true
  }
})

proxy.aliasName
