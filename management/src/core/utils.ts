import cryptojs from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

export function hash_value(prefix: string, value: string, rounds: number): string {
  const hsh = (input: string) => cryptojs.enc.Hex.stringify(cryptojs.SHA512(prefix + input))
  return new Array(rounds).reduce((h, cur) => h + hsh(cur + h + value), hsh(value));
};

export function uuid(): string {
  return uuidv4()
};

export function tick() {
  return new Date().getTime()
}

export function validate_email(email: string): boolean {
  // https://stackoverflow.com/a/9204568
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}