import { isEmpty } from "lodash";
import { action, makeObservable } from "mobx";

import { EntityType, type IBaseEntity, type TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import { currentDateTime } from "../utils/Date";
import { uuid } from "../utils/Utils";

export type TCurrencyUUID = string;

export interface ICurrency extends IBaseEntity {
	currency_uuid: TCurrencyUUID;
	name: string;
	short: string;
	suffix: string;
	prefix: string;
	decimals: number;
}

export type CurrencyAmount = {
	amount: number;
	currency?: ICurrency;
};

export class CurrencyStore extends MappedStore<ICurrency> {
	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: (c) => c.currency_uuid,
			factory: (id?: string) =>
				({
					entity_type: EntityType.CURRENCY,
					currency_uuid: id || uuid(),
					name: "",
					short: "",
					prefix: "",
					suffix: "",
					decimals: 2,
					tags: [],
					updated: currentDateTime(),
					created: currentDateTime(),
				}) as ICurrency,
		});

		makeObservable(this, { addDefaults: action });
	}

	findByName(name: string) {
		return this.all.filter((c) => c.short === name || c.name === name)[0];
	}

	findUuidByName(name: string) {
		return this.findByName(name).currency_uuid;
	}

	format(currency: ICurrency, value: TMonetary) {
		return (
			currency.prefix + this.formatAmount(currency, value) + currency.suffix
		);
	}

	formatAmount(currency: ICurrency, value: TMonetary) {
		return value.toLocaleString(undefined, {
			maximumFractionDigits: Math.max(1, Math.min(currency.decimals, 100)),
			minimumFractionDigits: Math.max(1, Math.min(currency.decimals, 100)),
		});
	}

	formatByUuid(currency_uuid: TCurrencyUUID, value: TMonetary) {
		const currency = this.byUuid(currency_uuid);

		return (currency && this.format(currency, value)) || `${value}`;
	}

	nameForUuid(currency_uuid: TCurrencyUUID) {
		const currency = this.byUuid(currency_uuid);

		return currency?.name || "";
	}

	currencyTags(currency_uuid: TCurrencyUUID) {
		const curr = this.byUuid(currency_uuid);
		if (curr) {
			return curr.tags || [];
		}

		return [];
	}

	addDefaults() {
		const addDefault = (currency: ICurrency) => {
			currency.currency_uuid = `${currency.name}_${currency.short}`;
			this.merge(currency);
		};

		// Prettier-ignore
		if (isEmpty(this.all)) {
			addDefault({
				...this.factory(),
				name: "Real brasileiro",
				short: "BRL",
				prefix: "R$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "United States dollar",
				short: "USD",
				prefix: "$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Euro",
				short: "EUR",
				prefix: "€",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Japonese yen",
				short: "JPY",
				prefix: "¥",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "British sterling",
				short: "GBP",
				prefix: "£",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Australian dollar",
				short: "AUD",
				prefix: "A$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Canadian dollar",
				short: "CAD",
				prefix: "C$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Swiss franc",
				short: "CHF",
				prefix: "CHF",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Chinese renminbi",
				short: "CNY",
				prefix: "¥",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Hong Kong dollar",
				short: "HKD",
				prefix: "HK$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "New Zealand dollar",
				short: "NZD",
				prefix: "NZ$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Swedish krona",
				short: "SEK",
				prefix: "",
				suffix: "KR",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "South Korean won",
				short: "KRW",
				prefix: "₩",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Singapore dollar",
				short: "SGD",
				prefix: "S$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Norwegian krone",
				short: "NOK",
				prefix: "",
				suffix: "kr",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Mexican peso",
				short: "MXN",
				prefix: "$",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Indian rupee",
				short: "INR",
				prefix: "₹",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Russian ruble",
				short: "RUB",
				prefix: "",
				suffix: "₽",
				decimals: 20,
			});
			addDefault({
				...this.factory(),
				name: "South African rand",
				short: "ZAR",
				prefix: "R",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Turkish lira",
				short: "TRY",
				prefix: "₺",
				suffix: "",
				decimals: 2,
			});
			addDefault({
				...this.factory(),
				name: "Bitcoin",
				short: "BTC",
				prefix: "₿",
				suffix: "",
				decimals: 8,
			});
			addDefault({
				...this.factory(),
				name: "Etherium",
				short: "ETH",
				prefix: "Ξ",
				suffix: "",
				decimals: 8,
			});
		}
	}
}

export default CurrencyStore;
