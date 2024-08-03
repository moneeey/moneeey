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
	importingTasks: ImportTask[],
) => {
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
							moneeeyStore.navigation.importingTasks.length,
						);
					}}
					configuration={moneeeyStore.config}
				/>
			),
		},
		...importingTasks.map((task) => ({
			key: task.taskId,
			label: task.input.name,
			children: <ImportProcess task={task} />,
		})),
	];
};

export const ImportHeader = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { importingTasks } = moneeeyStore.navigation;
	const tabItems = useTabItems(moneeeyStore, Messages, importingTasks);

	return (
		<TabsHeader key={importingTasks.length} testId={tabId} items={tabItems} />
	);
});

const Import = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { importingTasks } = moneeeyStore.navigation;
	const tabItems = useTabItems(moneeeyStore, Messages, importingTasks);

	return (
		<TabsContent key={importingTasks.length} testId={tabId} items={tabItems} />
	);
});

export default Import;
