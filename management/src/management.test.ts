import Management from "./management.jsx";

describe('management server', () => {
  let management = new Management()
  beforeEach(() => {
    management = new Management()
  })

  it('hash email', () => {
    expect(management.hash_email('fernando@baroni.tech')).toEqual('649b5631842f698d06386cd5cbc461fb1efa241436df4aa4479323a7d1111e2a647cac4c3946d9280284e7e13cc104e23b0cc2711d0a89a18d60e76de0e4f758')
  })
});