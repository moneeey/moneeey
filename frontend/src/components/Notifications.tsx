import { isEmpty } from "lodash";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";

import type { NotificationData } from "../shared/Navigation";
import useMoneeeyStore from "../shared/useMoneeeyStore";

import { Status } from "./Status";

const MAX_NOTIFICATION_LIFE = 2000;

const Notifications = observer(() => {
	const { navigation } = useMoneeeyStore();
	const [visible, setVisible] = useState([] as NotificationData[]);
	const { notifications } = navigation;

	useEffect(() => {
		if (!visible) {
			return;
		}
		const life = (notification: NotificationData) =>
			new Date().getTime() - notification.created.getTime();
		const timeout = Math.max(
			0,
			Math.min(...visible.map(life).map((ms) => MAX_NOTIFICATION_LIFE - ms)),
		);
		const timerId = setTimeout(() => {
			setVisible((prevVisible) =>
				prevVisible.filter(
					(notification) => life(notification) < MAX_NOTIFICATION_LIFE,
				),
			);
		}, timeout);

		return () => clearTimeout(timerId);
	}, [visible]);

	useEffect(() => {
		if (!isEmpty(notifications)) {
			setVisible((prevVisible) => [...prevVisible, ...notifications]);
			navigation.clearNotifications();
		}
	}, [notifications, navigation]);

	return (
		<section className="fixed right-0 top-0 z-50 m-4">
			{visible.map((data) => (
				<Status
					key={data.id}
					type={data.type}
					onDismiss={() => {
						setVisible((prevVisible) =>
							prevVisible.filter((notification) => notification.id !== data.id),
						);
					}}
				>
					{data.text}
				</Status>
			))}
		</section>
	);
});

export { Notifications, Notifications as default };
