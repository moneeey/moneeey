import { chunk } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

const uuid = () => uuidv4();

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const identity = (o: unknown) => o;

const tokenize = (text: string | undefined) => (text || '').toLowerCase().split(/[\W\d]/);

const asyncTimeout = function <R>(fn: () => R | Promise<R>, delay: number): Promise<R> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn());
    }, delay);
  });
};

const asyncProcess = async function <T, R>(
  values: T[],
  fn: (chnk: T[], state: R, percentage: number) => void,
  options: {
    state?: R;
    chunkSize?: number;
    chunkThrottle?: number;
  }
): Promise<R> {
  const chunks = chunk(values, options.chunkSize || 50);
  const tasksTotal = chunks.length;
  const state = options.state || ({} as R);

  const process = async () => {
    const chnk = chunks.shift();
    if (!chnk) {
      return;
    }
    const percentage = Math.round((1 - chunks.length / tasksTotal) * 10000) / 100;
    await asyncTimeout(() => fn(chnk || [], state, percentage), options.chunkThrottle || 20);
    await process();
  };
  await process();

  return state;
};

enum StorageKind {
  PERMANENT,
  SESSION,
}

const getStorage = function (key: string, defaault: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    return window.localStorage.getItem(key) || defaault;
  } else if (storage === StorageKind.SESSION) {
    return window.sessionStorage.getItem(key) || defaault;
  }
};

const setStorage = function (key: string, value: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    window.localStorage.setItem(key, value);
  } else if (storage === StorageKind.SESSION) {
    window.sessionStorage.setItem(key, value);
  }
};

export { uuid, tokenize, asyncProcess, getStorage, setStorage, StorageKind, noop, identity };
