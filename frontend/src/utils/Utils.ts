import { chunk, flatten } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export function uuid() {
  return uuidv4()
}

export function tokenize(text: string | undefined) {
  return flatten((text||'').split(/[^\w]/))
}

export async function asyncTimeout<R>(fn: () => R | Promise<R>, delay: number): Promise<R> {
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn())
    }, delay)
  })
}

export async function asyncProcess<T, State>(
  values: T[],
  fn: (chnk: T[], state: State, chunks: T[][], tasks: number, tasksTotal: number) => void,
  state: State,
  chunkSize = 20,
  chunkThrottle = 2
) {
  const chunks = chunk(values, chunkSize)
  const tasksTotal = chunks.length
  while (chunks.length > 0) {
    const chunk = chunks.shift()
    await asyncTimeout(() => fn(chunk || [], state, chunks, chunks.length, tasksTotal), chunkThrottle)
  }
  return state
}