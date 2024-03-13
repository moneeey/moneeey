import { observer } from "mobx-react";

import { Input } from "../base/Input";

import { TagsMemo } from "../Tags";

import type {
	FieldAcessor,
	FieldDefHelper,
	FieldRenderProps,
} from "./FieldDef";

const tagsForText = (text: string): string[] =>
	Array.from(text.matchAll(/[^#]?(#\w+)/g)).map((m: RegExpMatchArray) =>
		m[1].replace("#", ""),
	);

export default function <TEntity>({
	read,
	delta,
}: FieldAcessor<TEntity, string>): FieldDefHelper<TEntity> {
	return {
		render: observer(
			({ entity, commit, field, isError }: FieldRenderProps<TEntity>) => (
				<Input
					testId={`editor${field.title.replace(" ", "_")}`}
					readOnly={field.readOnly}
					placeholder={field.title}
					isError={isError}
					value={read(entity)}
					onChange={(value: string) => commit({ ...entity, ...delta(value) })}
					suffix={<TagsMemo tags={tagsForText(read(entity))} />}
				/>
			),
		),
		sorter: (a: TEntity, b: TEntity, asc: boolean): number =>
			asc ? read(a).localeCompare(read(b)) : read(b).localeCompare(read(a)),
	};
}
