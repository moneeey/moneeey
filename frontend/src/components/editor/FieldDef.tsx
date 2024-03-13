export type FieldAcessor<TEntity, TValue> = {
	read(entity: TEntity): TValue;
	delta(value: TValue): Partial<TEntity>;
};

export type FieldRenderProps<TEntity> = {
	rev: string;
	entity: TEntity;
	commit(entity: TEntity): void;
	field: FieldDef<TEntity>;
	isError: boolean;
};
export type FieldRenderFn<TEntity> = (
	props: FieldRenderProps<TEntity>,
) => JSX.Element;

export type FieldDefHelper<TEntity> = {
	render: FieldRenderFn<TEntity>;
	sorter(a: TEntity, b: TEntity, asc: boolean): number;
};

export type FieldDef<TEntity> = {
	title: string;
	readOnly?: boolean;
	required?: boolean;
	defaultSortOrder?: "descend" | "ascend";
	width: number;

	sorter(a: TEntity, b: TEntity, asc: boolean): number;
	render(props: FieldRenderProps<TEntity>): JSX.Element;
	validate(entity: TEntity): { valid: boolean; error?: string };
};
