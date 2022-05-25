import * as utils from './utils';

describe('utils', () => {
  it('hash_value', () => {
    expect(utils.hash_value('prefix', 'value', 256))
      .toEqual('1426360dae975cf62136b7fd64f4a173314b9922869e28fd9e9991060ee1bd702886592c5fad5f58a995b28ef0ce40afdf91891dfd6cacce8605a5c34deebb31')
  })
})