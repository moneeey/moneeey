import { observer } from "mobx-react-lite";

import type { MobileRenderContext } from "../../components/TableEditor";
import type { FieldDef } from "../../components/editor/FieldDef";
import type { IBaseEntity } from "../../shared/Entity";

type Props<T extends IBaseEntity> = MobileRenderContext<T> & {
	schema: FieldDef<T>[];
	titleField?: string;
};

function DefaultMobileRowInner<T extends IBaseEntity>({
	schema,
	renderField,
	titleField,
}: Props<T>) {
	const titleFieldDef = titleField
		? schema.find((f) => f.title === titleField)
		: schema[0];
	const rest = schema.filter((f) => f.title !== titleFieldDef?.title);

	return (
		<div className="flex h-full flex-col gap-1 py-1">
			{titleFieldDef ? (
				<div className="font-semibold">{renderField(titleFieldDef.title)}</div>
			) : null}
			<div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
				{rest.map((field) => (
					<div key={field.title} className="flex items-center gap-1">
						<span className="shrink-0 text-muted-foreground">
							{field.title}:
						</span>
						<div className="min-w-0 flex-1">{renderField(field.title)}</div>
					</div>
				))}
			</div>
		</div>
	);
}

const DefaultMobileRow = observer(DefaultMobileRowInner) as <
	T extends IBaseEntity,
>(
	props: Props<T>,
) => JSX.Element;

export default DefaultMobileRow;
