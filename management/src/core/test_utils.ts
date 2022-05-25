import * as utils from '../core/utils';

export function mockDb() {
  const history = [] as any[];
  const spy = jest.fn();
  const addHistorySpy =
    (level: string) =>
    (...args: any[]) => {
      history.push({ [level]: args });
      return spy(...args);
    };
  return {
    connect: addHistorySpy('connect'),
    get: addHistorySpy('get'),
    put: addHistorySpy('put'),
    remove: addHistorySpy('remove'),
    destroy: addHistorySpy('destroy'),
    close: addHistorySpy('close'),
    history,
    spy,
  };
};
export type mockDbType = ReturnType<typeof mockDb>;

export function ConsoleMock() {
  const history = [] as any[];
  const addLog =
    (level: string) =>
    (...args: any[]) =>
      history.push({ [level]: args });
  return {
    log: addLog('log'),
    debug: addLog('debug'),
    info: addLog('info'),
    warn: addLog('warn'),
    error: addLog('error'),
    history
  };
}

export type ConsoleMockType = ReturnType<typeof ConsoleMock>;

export function mock_utils() {
  let tick = 123450000;
  jest.spyOn(utils, 'uuid').mockImplementation(() => 'UUIDUUID-dcf7-6969-a608-420' + tick++);
  jest.spyOn(utils, 'tick').mockImplementation(() => tick++);
  jest.spyOn(utils, 'hash_value').mockImplementation((_prefix, value, _rounds) => 'hashed:-' + (tick++) + '-' + value);
}