import { isEmpty } from "lodash";
import { action, computed, makeObservable } from "mobx";

import { EntityType, type IBaseEntity } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import type MoneeeyStore from "../shared/MoneeeyStore";
import { TDateFormat, currentDateTime, setLocale } from "../utils/Date";

import type { TCurrencyUUID } from "./Currency";

export type SyncConfig = {
	url: string;
	username: string;
	password: string;
	enabled: boolean;
};

export interface IConfig extends IBaseEntity {
	locale: string;
	date_format: string;
	decimal_separator: string;
	thousand_separator: string;
	default_currency: TCurrencyUUID;
	view_archived: boolean;
	couchSync?: SyncConfig;
}

export class ConfigStore extends MappedStore<IConfig> {
	constructor(moneeeyStore: MoneeeyStore) {
		super(moneeeyStore, {
			getUuid: () => "CONFIG",
			factory: () =>
				({
					entity_type: EntityType.CONFIG,
					locale: "en",
					date_format: TDateFormat,
					decimal_separator: ",",
					thousand_separator: ".",
					default_currency: "",
					view_archived: false,
					couchSync: {
						enabled: false,
						url: "",
						username: "",
						password: "",
					},
					updated: currentDateTime(),
					created: currentDateTime(),
				}) as IConfig,
		});

		makeObservable(this, {
			main: computed,
			init: action,
		});
	}

	merge(item: IConfig, options?: { setUpdated: boolean }): void {
		setLocale(item.locale);
		super.merge(item, options);
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
