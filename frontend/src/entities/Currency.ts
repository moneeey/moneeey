import { isEmpty } from "lodash";
import { action, makeObservable } from "mobx";

import { EntityType, type IBaseEntity, type TMonetary } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import { currentDateTime } from "../utils/Date";
import { uuid } from "../utils/Utils";

export type TCurrencyUUID = string;

export const DefaultCurrencies = [
	{
		name: "United States Dollar",
		code: "USD",
		prefix: "$",
		suffix: "",
		decimals: 2,
	},
	{ name: "Euro", code: "EUR", prefix: "€", suffix: "", decimals: 2 },
	{
		name: "Japanese Yen",
		code: "JPY",
		prefix: "¥",
		suffix: "",
		decimals: 0,
	},
	{
		name: "British Pound Sterling",
		code: "GBP",
		prefix: "£",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Australian Dollar",
		code: "AUD",
		prefix: "$",
		suffix: "AUD",
		decimals: 2,
	},
	{
		name: "Canadian Dollar",
		code: "CAD",
		prefix: "$",
		suffix: "CAD",
		decimals: 2,
	},
	{
		name: "Swiss Franc",
		code: "CHF",
		prefix: "CHF",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Chinese Yuan",
		code: "CNY",
		prefix: "¥",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Swedish Krona",
		code: "SEK",
		prefix: "kr",
		suffix: "",
		decimals: 2,
	},
	{
		name: "New Zealand Dollar",
		code: "NZD",
		prefix: "$",
		suffix: "NZD",
		decimals: 2,
	},
	{
		name: "Mexican Peso",
		code: "MXN",
		prefix: "$",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Singapore Dollar",
		code: "SGD",
		prefix: "$",
		suffix: "SGD",
		decimals: 2,
	},
	{
		name: "Hong Kong Dollar",
		code: "HKD",
		prefix: "$",
		suffix: "HKD",
		decimals: 2,
	},
	{
		name: "Norwegian Krone",
		code: "NOK",
		prefix: "kr",
		suffix: "",
		decimals: 2,
	},
	{
		name: "South Korean Won",
		code: "KRW",
		prefix: "₩",
		suffix: "",
		decimals: 0,
	},
	{
		name: "Turkish Lira",
		code: "TRY",
		prefix: "₺",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Russian Ruble",
		code: "RUB",
		prefix: "₽",
		suffix: "",
		decimals: 8,
	},
	{
		name: "Indian Rupee",
		code: "INR",
		prefix: "₹",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Brazilian Real",
		code: "BRL",
		prefix: "R$",
		suffix: "",
		decimals: 2,
	},
	{
		name: "South African Rand",
		code: "ZAR",
		prefix: "R",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Philippine Peso",
		code: "PHP",
		prefix: "₱",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Czech Koruna",
		code: "CZK",
		prefix: "Kč",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Indonesian Rupiah",
		code: "IDR",
		prefix: "Rp",
		suffix: "",
		decimals: 0,
	},
	{
		name: "Malaysian Ringgit",
		code: "MYR",
		prefix: "RM",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Hungarian Forint",
		code: "HUF",
		prefix: "Ft",
		suffix: "",
		decimals: 0,
	},
	{
		name: "Icelandic Krona",
		code: "ISK",
		prefix: "kr",
		suffix: "",
		decimals: 0,
	},
	{
		name: "Croatian Kuna",
		code: "HRK",
		prefix: "kn",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Bulgarian Lev",
		code: "BGN",
		prefix: "лв",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Israeli New Shekel",
		code: "ILS",
		prefix: "₪",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Chilean Peso",
		code: "CLP",
		prefix: "$",
		suffix: "",
		decimals: 0,
	},
	{
		name: "UAE Dirham",
		code: "AED",
		prefix: "د.إ",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Saudi Riyal",
		code: "SAR",
		prefix: "ر.س",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Romanian Leu",
		code: "RON",
		prefix: "lei",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Colombian Peso",
		code: "COP",
		prefix: "$",
		suffix: "",
		decimals: 0,
	},
	{ name: "Thai Baht", code: "THB", prefix: "฿", suffix: "", decimals: 2 },
	{
		name: "Vietnamese Dong",
		code: "VND",
		prefix: "₫",
		suffix: "",
		decimals: 0,
	},
	{
		name: "Egyptian Pound",
		code: "EGP",
		prefix: "£",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Peruvian Sol",
		code: "PEN",
		prefix: "S/",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Pakistani Rupee",
		code: "PKR",
		prefix: "₨",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Kuwaiti Dinar",
		code: "KWD",
		prefix: "د.ك",
		suffix: "",
		decimals: 3,
	},
	{
		name: "Ukrainian Hryvnia",
		code: "UAH",
		prefix: "₴",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Bangladeshi Taka",
		code: "BDT",
		prefix: "৳",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Argentine Peso",
		code: "ARS",
		prefix: "$",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Algerian Dinar",
		code: "DZD",
		prefix: "د.ج",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Moroccan Dirham",
		code: "MAD",
		prefix: "د.م",
		suffix: "",
		decimals: 2,
	},
	{
		name: "Jordanian Dinar",
		code: "JOD",
		prefix: "د.ا",
		suffix: "",
		decimals: 3,
	},
	{
		name: "Bahraini Dinar",
		code: "BHD",
		prefix: "ب.د",
		suffix: "",
		decimals: 3,
	},
	{
		name: "Omani Rial",
		code: "OMR",
		prefix: "ر.ع",
		suffix: "",
		decimals: 3,
	},
	{
		name: "Serbian Dinar",
		code: "RSD",
		prefix: "дин",
		suffix: "",
		decimals: 2,
	},
	{ name: "Bitcoin", code: "BTC", prefix: "₿", suffix: "", decimals: 8 },
	{ name: "Ethereum", code: "ETH", prefix: "Ξ", suffix: "", decimals: 18 },
];

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
			for (const def of DefaultCurrencies) {
				addDefault({
					...this.factory(),
					name: def.name,
					short: def.code,
					prefix: def.prefix,
					suffix: def.suffix,
					decimals: def.decimals,
				});
			}
		}
	}
}

export default CurrencyStore;
