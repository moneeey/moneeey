import type { TDateTime } from "../utils/Date";

export type TMonetary = number;

export enum EntityType {
	ACCOUNT = "ACCOUNT",
	TRANSACTION = "TRANSACTION",
	BUDGET = "BUDGET",
	CURRENCY = "CURRENCY",
	CONFIG = "CONFIG",
	VIRTUAL_BUDGET_ENVELOPE = "VIRTUAL_BUDGET_ENVELOPE",
}

export interface IBaseEntity {
	[k: string]: unknown;
	id: string;
	entity_type: EntityType;
	tags: string[];
	updated_at: TDateTime;
	created?: TDateTime;
	deleted_at?: TDateTime | null;
}

const isEntityType =
	<TEntityType extends { entity_type?: EntityType | undefined }>(
		entity_type: EntityType,
	) =>
	(object: {
		entity_type?: EntityType;
	}): object is TEntityType =>
		object?.entity_type === entity_type;

export { isEntityType };
