import { isEmpty } from 'lodash';
import { action, computed, makeObservable } from 'mobx';

import { EntityType, IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import MoneeeyStore from '../shared/MoneeeyStore';
import { TDateFormat, currentDateTime } from '../utils/Date';
import { uuid } from '../utils/Utils';

import { TCurrencyUUID } from './Currency';

export type SyncConfig = {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
};

export interface IConfig extends IBaseEntity {
  database_url: string;
  date_format: string;
  decimal_separator: string;
  thousand_separator: string;
  default_currency: TCurrencyUUID;
  view_months: number;
  view_archived: boolean;
  couchSync?: SyncConfig;
}

export class ConfigStore extends MappedStore<IConfig> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(moneeeyStore, {
      getUuid: () => 'CONFIG',
      factory: () =>
        ({
          entity_type: EntityType.CONFIG,
          date_format: TDateFormat,
          database_url: uuid(),
          decimal_separator: ',',
          thousand_separator: '.',
          default_currency: '',
          view_months: 3,
          view_archived: false,
          couchSync: {
            enabled: false,
            url: '',
            username: '',
            password: '',
          },
          updated: currentDateTime(),
          created: currentDateTime(),
        } as IConfig),
    });

    makeObservable(this, {
      main: computed,
      init: action,
    });
  }

  get main(): IConfig {
    return isEmpty(this.all) ? this.factory() : this.all[0];
  }

  init() {
    if (isEmpty(this.all)) {
      this.merge({ ...this.factory() });
    }
  }
}

export default ConfigStore;
