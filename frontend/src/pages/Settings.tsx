import { useState } from "react";

import Loading from "../components/Loading";
import { PrimaryButton, SecondaryButton } from "../components/base/Button";
import Drawer from "../components/base/Drawer";
import { TextArea } from "../components/base/Input";
import Space, { VerticalSpace } from "../components/base/Space";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import ConfigTable from "../tables/ConfigTable";
import useMessages from "../utils/Messages";
import { noop } from "../utils/Utils";

type Action = {
	title: string;
	content: string;
	submitTitle?: string;
	submitFn?: (data: Action) => void;
};

export default function Settings() {
	const Messages = useMessages();
	const [action, setAction] = useState<Action | undefined>(undefined);
	const [loading, setLoading] = useState<number | false>(false);
	const moneeeyStore = useMoneeeyStore();

	const onExportData = async () => {
		const update = (newContent: string) =>
			setAction({
				title: Messages.settings.export_data,
				content: newContent,
			});
		update(Messages.settings.backup_loading(0));
		const data = await moneeeyStore.persistence.exportAll((percentage) => {
			update(Messages.settings.backup_loading(percentage));
			setLoading(percentage);
		});
		setLoading(false);
		update(data);
	};
	const onImportData = () => {
		const update = (newContent: string) =>
			setAction({
				title: Messages.settings.import_data,
				content: newContent,
				submitTitle: Messages.util.close,
				submitFn: noop,
			});
		const submitFn = async (data: Action) => {
			const input = data?.content || "";
			update(Messages.settings.restore_loading(0));
			await moneeeyStore.persistence.restoreAll(input, (percentage) => {
				update(Messages.settings.restore_loading(percentage));
				setLoading(percentage);
			});
			setLoading(false);
			update(Messages.settings.reload_page);
		};
		setAction({
			content: Messages.settings.restore_data_placeholder,
			title: Messages.settings.import_data,
			submitFn,
			submitTitle: Messages.settings.import_data,
		});
	};

	const onClearData = () => {
		setAction({
			title: Messages.settings.clear_all,
			content: Messages.settings.clear_data_placeholder,
			submitTitle: Messages.settings.clear_all,
			submitFn: (data) => {
				if (data && data.content === Messages.settings.clear_data_token) {
					moneeeyStore.persistence.truncateAll();
					setAction({ ...data, content: Messages.settings.reload_page });
				}
			},
		});
	};

	return (
		<>
			<Space className="p-2 scale-75">
				<PrimaryButton onClick={onExportData}>
					{Messages.settings.export_data}
				</PrimaryButton>
				<SecondaryButton onClick={onImportData}>
					{Messages.settings.import_data}
				</SecondaryButton>
				<SecondaryButton onClick={onClearData}>
					{Messages.settings.clear_all}
				</SecondaryButton>
			</Space>
			<VerticalSpace>
				{action && (
					<Drawer
						testId="accountSettings"
						header={action.title}
						footer={
							<Space>
								<SecondaryButton
									onClick={() => setAction(undefined)}
									title={Messages.util.close}
								/>
								{action.submitFn && (
									<PrimaryButton
										onClick={() => action.submitFn?.(action)}
										title={action.submitTitle}
									/>
								)}
							</Space>
						}
					>
						<div className="bg-background-900 p-2">
							<Loading progress={loading || 0} loading={Boolean(loading)}>
								<TextArea
									testId="importExportOutput"
									value={action.content}
									onChange={(value) =>
										setAction((cont) => cont && { ...cont, content: value })
									}
									placeholder={"Data"}
									rows={16}
								/>
							</Loading>
						</div>
					</Drawer>
				)}
				<ConfigTable config={moneeeyStore.config} />
			</VerticalSpace>
		</>
	);
}
