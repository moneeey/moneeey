import { IBaseEntity, TMonetary } from "./Entity";
import MappedStore from "./MappedStore";

export type TCurrencyUUID = string;

export interface Currency extends IBaseEntity {
  currency_uuid: TCurrencyUUID;
  name: string;
  short: string;
  suffix: string;
  prefix: string;
}

export class CurrencyStore extends MappedStore<Currency> {
  constructor() {
    super((c) => c.currency_uuid);
  }

  findByName(name: string) {
    return this.all().filter((c) => c.short === name || c.name === name)[0];
  }

  findUuidByName(name: string) {
    return this.findByName(name).currency_uuid;
  }

  format(currency: Currency, value: TMonetary) {
    return currency.prefix + value.toLocaleString() + currency.suffix;
  }

  formatByUuid(currency_uuid: TCurrencyUUID, value: TMonetary) {
    return this.format(this.byUuid(currency_uuid), value);
  }
}
