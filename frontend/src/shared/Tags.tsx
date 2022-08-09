import { forEach } from 'lodash'
import { action, computed, makeObservable, observable } from 'mobx'

export default class TagsStore {
  public readonly available = new Set<string>()

  constructor() {
    makeObservable(this, {
      available: observable,
      all: computed,
      register: action,
    })
  }
 
  get all() {
    return Array.from(this.available).sort()
  }

  register = (tag: string) => {
    if (!this.available.has(tag)) {
      this.available.add(tag)
    }
  }

  registerAll(tags: string[]) {
    forEach(tags, this.register)
  }
}