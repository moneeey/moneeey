import { observer } from "mobx-react";
import type { ReactNode } from "react";

import type { IBaseEntity } from "../shared/Entity";
import type MappedStore from "../shared/MappedStore";

import type { WithDataTestId } from "./base/Common";

import { VerticalSpace } from "./base/Space";
import { TextNormal } from "./base/Text";
import type { FieldDef } from "./editor/FieldDef";

interface BaseFormEditor extends WithDataTestId {
	className?: string;
	footer?: ReactNode;
	items: {
		label: string;
		editor: JSX.Element;
	}[];
}

export const BaseFormEditor = ({
	className,
	testId,
	items,
	footer,
}: BaseFormEditor) => (
	<VerticalSpace
		className={`bg-background-800 p-4 ${className || ""}`}
		testId={testId}
	>
		{items.map((item) => (
			<div key={item.label}>
				<TextNormal>{item.label}</TextNormal>
				<div className="bg-background-900 p-2">{item.editor}</div>
			</div>
		))}
		<footer>{footer}</footer>
	</VerticalSpace>
);

interface FormEditorProps<T extends IBaseEntity> extends WithDataTestId {
	className?: string;
	store: MappedStore<T>;
	schema: FieldDef<T>[];
	entity: T;
}

export default observer(
	<T extends IBaseEntity>({
		className,
		store,
		schema,
		entity,
		testId,
	}: FormEditorProps<T>) => (
		<BaseFormEditor
			className={className}
			testId={testId}
			items={schema.map((field) => ({
				label: field.title,
				editor: (
					<field.render
						rev={entity?._rev || ""}
						entity={entity}
						field={field}
						commit={(updated) =>
							field.validate(updated) && store.merge(updated)
						}
						isError={!field.validate(entity)}
					/>
				),
			}))}
		/>
	),
);
