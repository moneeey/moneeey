import hashjs from 'hash.js';
import { v4 as uuidv4 } from 'uuid';

export function hash_value(prefix: string, value: string, rounds: number): string {
  const hsh = (input: string) => hashjs
      .sha512()
      .update(prefix + input)
      .digest('hex');
  return new Array(rounds).reduce((h, cur) => h + hsh(cur + h + value), hsh(value));
};

export function uuid(): string {
  return uuidv4()
};

export function tick() {
  return new Date().getTime()
}