export function mockDb(dbName: string, options: object) {
  const history = [] as any[];
  const spy = jest.fn();
  const addHistorySpy =
    (level: string) =>
    (...args: any[]) => {
      history.push({ [level]: args });
      return spy(...args);
    };
  return {
    dbName,
    get: addHistorySpy('get'),
    put: addHistorySpy('put'),
    remove: addHistorySpy('remove'),
    close: addHistorySpy('close'),
    history,
    spy,
    options,
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