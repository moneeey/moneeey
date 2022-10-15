import { forEach } from 'lodash';
import { action, computed, makeObservable, observable } from 'mobx';

import Logger from './Logger';

export default class TagsStore {
  public readonly available = new Set<string>();

  logger: Logger;

  constructor(parent: Logger) {
    this.logger = new Logger('tagsStore', parent);

    makeObservable(this, {
      available: observable,
      all: computed,
      register: action,
    });
  }

  get all() {
    return Array.from(this.available).sort();
  }

  register = (tag: string) => {
    if (!this.available.has(tag)) {
      this.logger.info('new tag', { tag });
      this.available.add(tag);
    }
  };

  registerAll(tags: string[]) {
    forEach(tags, this.register);
  }
}
