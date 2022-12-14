import { isEmpty } from 'lodash';
import { action, computed, makeObservable } from 'mobx';

import { EditorType } from '../components/editor/EditorProps';
import { EntityType, IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import MoneeeyStore from '../shared/MoneeeyStore';
import { TDateFormat, currentDateTime } from '../utils/Date';
import Messages from '../utils/Messages';

import { TCurrencyUUID } from './Currency';

export interface IConfig extends IBaseEntity {
  date_format: string;
  decimal_separator: string;
  default_currency: TCurrencyUUID;
  view_months: number;
  view_archived: boolean;
}

export class ConfigStore extends MappedStore<IConfig> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(moneeeyStore, {
      getUuid: () => 'CONFIG',
      factory: () =>
        ({
          entity_type: EntityType.CONFIG,
          date_format: TDateFormat,
          decimal_separator: ',',
          default_currency: '',
          view_months: 3,
          view_archived: false,
          updated: currentDateTime(),
          created: currentDateTime(),
        } as IConfig),
      schema: () => ({
        date_format: {
          title: Messages.util.date_format,
          field: 'date_format',
          index: 0,
          editor: EditorType.TEXT,
        },
        decimal_separator: {
          title: Messages.settings.decimal_separator,
          field: 'decimal_separator',
          index: 1,
          editor: EditorType.TEXT,
        },
        default_currency: {
          title: Messages.settings.default_currency,
          field: 'default_currency',
          index: 2,
          editor: EditorType.CURRENCY,
        },
      }),
    });

    makeObservable(this, {
      main: computed,
      init: action,
    });
  }

  get main(): IConfig {
    return this.all[0];
  }

  init() {
    if (isEmpty(this.all)) {
      this.merge(this.factory());
    }
  }
}

export default ConfigStore;
