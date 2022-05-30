import { DateEditor, NumberEditor, TextEditor } from '../components/EntityEditor';
import { currentDateTime } from './Date';
import { EntityType, IBaseEntity, TMonetary } from './Entity';
import MappedStore from './MappedStore';
import { uuid } from './Utils';

export type TCurrencyUUID = string;

export interface ICurrency extends IBaseEntity {
  currency_uuid: TCurrencyUUID;
  name: string;
  short: string;
  suffix: string;
  prefix: string;
  decimals: number;
}

export class CurrencyStore extends MappedStore<ICurrency, {}> {
  constructor() {
    super((c) => c.currency_uuid,
    () => ({
      entity_type: EntityType.CURRENCY,
      currency_uuid: uuid(),
      name: '',
      short: '',
      prefix: '',
      suffix: '',
      decimals: 2,
      updated: currentDateTime(),
      created: currentDateTime(),
    } as ICurrency),
    (props) => ({
        name: {
          title: 'Name',
          field: 'name',
          required: true,
          validate: (value) => {
            if (value.length < 2) return { valid: false, error: 'Please type a name' };
            return { valid: true };
          },
          index: 0,
          renderer: TextEditor,
        },
        short: {
          title: 'Short name',
          field: 'short',
          index: 1,
          renderer: TextEditor,
        },
        prefix: {
          title: 'Prefix',
          field: 'prefix',
          index: 2,
          renderer: TextEditor,
        },
        suffix: {
          title: 'Suffix',
          field: 'suffix',
          index: 3,
          renderer: TextEditor,
        },
        decimals: {
          title: 'Decimals',
          field: 'decimals',
          index: 4,
          renderer: NumberEditor,
        },
        created: {
          title: 'Created',
          field: 'created',
          readOnly: true,
          index: 5,
          renderer: DateEditor,
        },
    }));
  }

  findByName(name: string) {
    return this.all.filter((c) => c.short === name || c.name === name)[0];
  }

  findUuidByName(name: string) {
    return this.findByName(name).currency_uuid;
  }

  format(currency: ICurrency, value: TMonetary) {
    return (
      currency.prefix +
      value.toLocaleString(undefined, {
        maximumFractionDigits: currency.decimals,
        minimumFractionDigits: currency.decimals
      }) +
      currency.suffix
    );
  }

  formatByUuid(currency_uuid: TCurrencyUUID, value: TMonetary) {
    const currency = this.byUuid(currency_uuid);
    return (currency && this.format(currency, value)) || '';
  }
}
