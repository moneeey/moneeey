import { chunk, compact } from 'lodash';
import { nanoid } from 'nanoid';

const uuid = () => nanoid();

const noop = () => {
  // No-op
};

const identity = (o: unknown) => o;

const tokenize = (text: string | undefined) => compact((text || '').toLowerCase().split(/[\W\d]/));

const asyncTimeout = function <R>(fn: () => R | Promise<R>, delay: number): Promise<R> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn());
    }, delay);
  });
};

const asyncSleep = function (delay: number): Promise<void> {
  return asyncTimeout(() => {
    // Sleeping... Zzzzz
  }, delay);
};

const capitalize = (text: string): string => {
  if (text) {
    return text.charAt(0).toUpperCase() + text.substring(1);
  }

  return text;
};

const asyncProcess = async function <T, R>(
  values: T[],
  fn: (chnk: T[], state: R, percentage: number) => void,
  options: {
    state?: R;
    chunkSize?: number;
    chunkThrottle?: number;
  } = {}
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
    fn(chnk || [], state, percentage);
    if (chunks.length) {
      await asyncSleep(options.chunkThrottle || 20);
    }
    await process();
  };
  await process();

  return state;
};

enum StorageKind {
  PERMANENT = 'PERMANENT',
  SESSION = 'SESSION',
}

const getStorage = function (key: string, defaultt: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    return window.localStorage.getItem(key) || defaultt;
  } else if (storage === StorageKind.SESSION) {
    return window.sessionStorage.getItem(key) || defaultt;
  }

  return defaultt;
};

const setStorage = function (key: string, value: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    window.localStorage.setItem(key, value);
  } else if (storage === StorageKind.SESSION) {
    window.sessionStorage.setItem(key, value);
  }
};

const getCurrentHost = function () {
  return `${window.location.protocol}//${window.location.host}`;
};

export type ClassNameType = React.HTMLProps<HTMLElement>['className'];

export const slugify = function (string: string) {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  if (string === '-') {
    return string;
  }

  return encodeURIComponent(
    string
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
      .replace(/&/g, '-and-') // Replace & with 'and'
      .replace(/[^\w-]+/g, '') // Remove all non-word characters
      .replace(/--+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, '') // Trim - from end of text
  );
};

export {
  uuid,
  tokenize,
  asyncProcess,
  asyncSleep,
  asyncTimeout,
  getStorage,
  setStorage,
  StorageKind,
  noop,
  identity,
  capitalize,
  getCurrentHost,
};
