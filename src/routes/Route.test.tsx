import { IRouteParameters, Route } from './Route';

interface ITestRouteParameters extends IRouteParameters {
  hello: string;
  world: string;
}

class TestRoute extends Route<ITestRouteParameters> {
  render() {
    return <div/>
  }
}

test('routeBase', () => {
  const hello = new TestRoute('/hello/:world', undefined);
  const r = new TestRoute('/:hello/:world', hello);
  expect(r.url({ hello: 'oi', world: 'tchau' })).toBe('/hello/tchau/oi/tchau');
});

test('routeBase slug', () => {
  const slugi = new TestRoute('/:hello/:world', undefined);
  expect(slugi.url({ hello: '----i need my !#&*@&#slugfication', world: 'to---be1982309183091-------' })).toBe(
    '/i-need-my-and-and-slugfication/to-be1982309183091'
  );
});
