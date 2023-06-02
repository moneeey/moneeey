import { registerSW } from 'virtual:pwa-register';

export const autoReload = function () {
  registerSW({ immediate: true });
};

export const askConfirm = function () {
  const updateSW = registerSW({
    onNeedRefresh() {
      // eslint-disable-next-line no-alert
      if (confirm('New Moneeey version is available, update?')) {
        updateSW(true);
      }
    },
  });
};

export default function initSw() {
  autoReload();
}
