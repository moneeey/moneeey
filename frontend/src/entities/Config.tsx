import { isEmpty } from 'lodash'
import { action, computed, makeObservable } from 'mobx'
import { EditorType } from '../components/editor/EditorProps'
import { IBaseEntity, EntityType } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import MoneeeyStore from '../shared/MoneeeyStore'
import { currentDateTime, TDateFormat } from '../utils/Date'
import { TCurrencyUUID } from './Currency'

export interface IConfig extends IBaseEntity {
  date_format: string
  decimal_separator: string
  default_currency: TCurrencyUUID
  view_months: number
  view_archived: boolean
}

export class ConfigStore extends MappedStore<IConfig> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      () => 'CONFIG',
      () =>
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
      () => ({
        date_format: {
          title: 'Date format',
          field: 'date_format',
          index: 0,
          editor: EditorType.TEXT,
        },
        decimal_separator: {
          title: 'Decimal Separator',
          field: 'decimal_separator',
          index: 1,
          editor: EditorType.TEXT,
        },
        default_currency: {
          title: 'Default Currency',
          field: 'default_currency',
          index: 2,
          editor: EditorType.CURRENCY,
        },
      })
    )

    makeObservable(this, {
      loaded: computed,
      main: computed,
      init: action,
    })
  }

  get main(): IConfig {
    return this.all[0]
  }

  get loaded(): boolean {
    return !isEmpty(this.all)
  }

  init() {
    this.merge({ ...this.factory(), ...this.all[0] }, { setUpdated: false })
  }
}

export default ConfigStore
