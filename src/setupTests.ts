// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

class Worker {
  url: string;
  onMessage = (..._args: any[]) => {}
  constructor(url: string) {
    this.url = url;
  }

  postMessage(msg: any) {
    this.onMessage(msg);
  }
}
window.Worker = Worker as any
URL.createObjectURL = () => '/your-url'
