import { IBaseEntity, TMonetary } from './Entity';
import MappedStore from './MappedStore';

export type TCurrencyUUID = string;

export interface ICurrency extends IBaseEntity {
  currency_uuid: TCurrencyUUID;
  name: string;
  short: string;
  suffix: string;
  prefix: string;
  decimals: number;
}

export class CurrencyStore extends MappedStore<ICurrency> {
  constructor() {
    super((c) => c.currency_uuid);
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
