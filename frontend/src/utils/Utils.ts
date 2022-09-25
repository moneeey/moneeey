import { chunk } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

const uuid = () => uuidv4()

const tokenize = (text: string | undefined) => (text || '').toLowerCase().split(/[\W\d]/)

const asyncTimeout = function <R>(fn: () => R | Promise<R>, delay: number): Promise<R> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn())
    }, delay)
  })
}

const asyncProcess = async function <T, State>(
  values: T[],
  fn: (chnk: T[], state: State, chunks: T[][], tasks: number, tasksTotal: number) => void,
  state: State,
  chunkSize = 20,
  chunkThrottle = 2
): Promise<State> {
  const chunks = chunk(values, chunkSize)
  const tasksTotal = chunks.length
  const tasks: Array<() => void> = []
  while (chunks.length > 0) {
    const chnk = chunks.shift()
    tasks.push(() => fn(chnk || [], state, chunks, chunks.length, tasksTotal))
  }
  const process = async () => {
    const task = tasks.pop()
    if (task) {
      await asyncTimeout(() => task(), chunkThrottle)
      await process()
    }
  }
  await process()

  return state
}

enum StorageKind {
  PERMANENT,
  SESSION,
}

const getStorage = function (key: string, defaault: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    return window.localStorage.getItem(key) || defaault
  } else if (storage === StorageKind.SESSION) {
    return window.sessionStorage.getItem(key) || defaault
  }
}

const setStorage = function (key: string, value: string, storage: StorageKind) {
  if (storage === StorageKind.PERMANENT) {
    window.localStorage.setItem(key, value)
  } else if (storage === StorageKind.SESSION) {
    window.sessionStorage.setItem(key, value)
  }
}

export { uuid, tokenize, asyncProcess, getStorage, setStorage, StorageKind }
