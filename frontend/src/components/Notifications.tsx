import { message } from 'antd';
import { isEmpty } from 'lodash';
import { observer } from 'mobx-react';

import useMoneeeyStore from '../shared/useMoneeeyStore';

const Notifications = observer(() => {
  const { navigation } = useMoneeeyStore();
  const { notifications } = navigation;

  if (!isEmpty(notifications)) {
    notifications.forEach((notification) => {
      switch (notification.type) {
        case 'error':
          message.error(notification.text);
          break;
        case 'success':
          message.success(notification.text);
          break;
        case 'warning':
          message.warning(notification.text);
          break;
        case 'info':
        default:
          message.info(notification.text);
          break;
      }
    });
    navigation.clearNotifications();
  }

  return <div />;
});

export { Notifications, Notifications as default };
