import { uniq } from "lodash";
import { observer } from "mobx-react";
import { useMemo, useState } from "react";

import { IBaseEntity } from "../shared/Entity";
import MappedStore from "../shared/MappedStore";
import {
	currentDateTime,
	dateDistanceInSecs,
	parseDateTime,
} from "../utils/Date";

import VirtualTable, { ColumnDef } from "./VirtualTableEditor";

import { WithDataTestId } from "./base/Common";
import { FieldDef } from "./editor/FieldDef";

interface TableEditorProps<T extends IBaseEntity> extends WithDataTestId {
	store: MappedStore<T>;
	schema: FieldDef<T>[];
	schemaFilter?: (row: T) => boolean;
	factory: (id?: string) => T;
	creatable?: boolean;
	showRecentEntries?: boolean;
}

export default observer(
	<T extends IBaseEntity>({
		schema,
		schemaFilter,
		store,
		factory,
		creatable,
		showRecentEntries,
	}: TableEditorProps<T>) => {
		const [newEntityId, setNewEntityId] = useState(() =>
			store.getUuid(store.factory()),
		);

		const storeIds = store.ids;

		const entities = useMemo(
			() =>
				uniq(
					storeIds
						.map((id) => store.byUuid(id) as T)
						.filter((row) => {
							const isSchemaFiltered = !schemaFilter || schemaFilter(row);
							const isRecent =
								showRecentEntries !== false &&
								row.updated &&
								dateDistanceInSecs(
									parseDateTime(row.updated),
									parseDateTime(currentDateTime()),
								) < 20;
							const isNewEntityId = store.getUuid(row) === newEntityId;

							return isSchemaFiltered || isRecent || isNewEntityId;
						})
						.map((row) => store.getUuid(row))
						.map((entityId) => {
							if (entityId === newEntityId) {
								setTimeout(() => setNewEntityId(store.getUuid(factory())), 500);
							}

							return entityId;
						})
						.concat(creatable === false ? [] : [newEntityId]),
				).map((entityId) => ({ entityId })),
			[storeIds, store, schemaFilter, newEntityId],
		);

		const columns = useMemo((): ColumnDef[] => {
			return schema.map((field, index) => {
				const { title, defaultSortOrder, width } = field;

				return {
					title,
					index,
					width,
					defaultSortOrder,
					render: ({ entityId }) => {
						const current = store.byUuid(entityId);

						return (
							<field.render
								rev={current?._rev || ""}
								entity={current || store.factory(entityId)}
								field={field}
								isError={Boolean(current && !field.validate(current).valid)}
								commit={(updated) =>
									field.validate(updated).valid && store.merge(updated)
								}
							/>
						);
					},
					sorter: (a, b, asc) =>
						field.sorter(
							store.byUuid(a.entityId) as T,
							store.byUuid(b.entityId) as T,
							asc,
						),
				};
			});
		}, [store, schema]);

		return (
			<VirtualTable
				columns={columns}
				rows={entities}
				isNewEntity={(row) => row.entityId === newEntityId}
			/>
		);
	},
);
