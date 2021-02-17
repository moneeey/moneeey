import { IBaseEntity, TMonetary } from "./Entity";

export type TCurrencyUUID = string;

export interface Currency extends IBaseEntity {
  currency_uuid: TCurrencyUUID;
  name: string;
  short: string;
  suffix: string;
  prefix: string;
}

export class CurrencyStore {
  currenciesByUuid: { [currency_uuid: string]: Currency } = {};
  currenciesList: Currency[] = [];

  add(currency: Currency) {
    this.currenciesByUuid = {
      ...this.currenciesByUuid,
      [currency.currency_uuid]: currency,
    };
    this.currenciesList = [...this.currenciesList, currency];
  }

  findByUuid(currency_uuid: TCurrencyUUID) {
    return this.currenciesByUuid[currency_uuid];
  }

  findByName(name: string) {
    return this.currenciesList.filter(
      (c) => c.short === name || c.name === name
    )[0];
  }

  findUuidByName(name: string) {
    return this.findByName(name).currency_uuid;
  }

  format(currency: Currency, value: TMonetary) {
    return currency.prefix + value.toLocaleString() + currency.suffix;
  }

  formatByUuid(currency_uuid: TCurrencyUUID, value: TMonetary) {
    return this.format(this.findByUuid(currency_uuid), value);
  }
}
