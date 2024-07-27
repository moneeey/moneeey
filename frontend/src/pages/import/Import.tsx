import { observer } from "mobx-react";

import { TabsContent, TabsHeader } from "../../components/base/Tabs";
import type { ImportTask } from "../../shared/import/ImportContent";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

import type MoneeeyStore from "../../shared/MoneeeyStore";
import ImportProcess from "./ImportProcessor";
import ImportStarter from "./ImportStarter";

const tabItems = (
	moneeeyStore: MoneeeyStore,
	Messages: ReturnType<typeof useMessages>,
	importingTasks: Map<string, ImportTask>,
) => {
	const closeImportTask = (task: ImportTask) =>
		moneeeyStore.navigation.removeImportingTask(task);
	const sortedTasks = Array.from(importingTasks.values()).sort((a, b) =>
		a.input.name.localeCompare(b.input.name),
	);

	return [
		{
			label: Messages.import.start,
			key: Messages.import.start,
			children: (
				<ImportStarter
					onTask={(task) => moneeeyStore.navigation.updateImportingTasks(task)}
					configuration={moneeeyStore.config}
				/>
			),
		},
		...sortedTasks.map((task) => ({
			key: task.input.name,
			label: (
				<span>
					{task.input.name}{" "}
					<span
						onClick={() => closeImportTask(task)}
						onKeyDown={() => closeImportTask(task)}
					>
						X
					</span>
				</span>
			),
			children: (
				<ImportProcess task={task} close={() => closeImportTask(task)} />
			),
		})),
	];
};

export const ImportHeader = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { importingTasks } = moneeeyStore.navigation;

	return (
		<TabsHeader
			testId="importTabs"
			items={tabItems(moneeeyStore, Messages, importingTasks)}
		/>
	);
});

const Import = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { importingTasks } = moneeeyStore.navigation;

	return (
		<TabsContent
			testId="importTabs"
			items={tabItems(moneeeyStore, Messages, importingTasks)}
		/>
	);
});

export default Import;
