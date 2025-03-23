import { uniq } from "lodash";
import { observer } from "mobx-react";
import { useCallback, useMemo, useState } from "react";

import type { IBaseEntity } from "../shared/Entity";
import type MappedStore from "../shared/MappedStore";

import VirtualTable, { type Row, type ColumnDef } from "./VirtualTableEditor";

import type { WithDataTestId } from "./base/Common";
import type { FieldDef } from "./editor/FieldDef";

interface TableEditorProps<T extends IBaseEntity> extends WithDataTestId {
	store: MappedStore<T>;
	schema: FieldDef<T>[];
	schemaFilter?: (row: T) => boolean;
	factory: (id?: string) => T;
	creatable?: boolean;
}

export default observer(
	<T extends IBaseEntity>({
		schema,
		schemaFilter,
		store,
		factory,
		creatable,
		testId,
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
							const isNewEntityId = store.getUuid(row) === newEntityId;

							return isSchemaFiltered || isNewEntityId;
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
			[creatable, storeIds, store, schemaFilter, newEntityId, factory],
		);

		const columns = useMemo((): ColumnDef[] => {
			return schema.map((field, index) => {
				const { title, defaultSortOrder, width, customClass } = field;

				return {
					title,
					index,
					width,
					customClass: !customClass
						? undefined
						: ({ entityId }: Row, rowIndex: number) => {
								const entity = store.byUuid(entityId);
								if (!entity) {
									return "";
								}
								return customClass(entity, rowIndex);
							},
					defaultSortOrder,
					render: observer(({ entityId }) => {
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
					}),
					sorter: (a, b, asc) => {
						const tA = store.byUuid(a.entityId) as T;
						const tB = store.byUuid(b.entityId) as T;
						return tA && tB ? field.sorter(tA, tB, asc) : 0;
					},
				};
			});
		}, [store, schema]);

		const isNewEntity = useCallback(
			(row: Row) => row.entityId === newEntityId,
			[newEntityId],
		);

		return (
			<VirtualTable
				testId={testId}
				key={testId}
				columns={columns}
				rows={entities}
				isNewEntity={isNewEntity}
			/>
		);
	},
);
