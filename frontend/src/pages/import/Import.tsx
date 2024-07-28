import { observer } from "mobx-react";

import { TabsContent, TabsHeader } from "../../components/base/Tabs";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import type { ImportTask } from "../../shared/import/ImportContent";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import ImportProcess from "./ImportProcessor";
import ImportStarter from "./ImportStarter";

const tabId = "importTabs";

const useTabItems = (
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
					onTask={(task) => {
						moneeeyStore.navigation.updateImportingTasks(task);
						moneeeyStore.navigation.updateTabsSelectedIndex(
							tabId,
							moneeeyStore.navigation.importingTasks.size,
						);
					}}
					configuration={moneeeyStore.config}
				/>
			),
		},
		...sortedTasks.map((task) => ({
			key: task.input.name,
			label: task.input.name,
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
	const tabItems = useTabItems(moneeeyStore, Messages, importingTasks);

	return <TabsHeader testId={tabId} items={tabItems} />;
});

const Import = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { importingTasks } = moneeeyStore.navigation;
	const tabItems = useTabItems(moneeeyStore, Messages, importingTasks);

	return <TabsContent testId={tabId} items={tabItems} />;
});

export default Import;
