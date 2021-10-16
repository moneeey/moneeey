import Observable from "./Observable";
import * as Bacon from "baconjs";
export default class ManagementStore extends Observable<ManagementStore> {
  registerOrLogin(email: string) {
    return Bacon.once(email)
      .flatMap(() => new Bacon.Error('fu'))
      .doAction(() => {
        this.dispatch(this);
      })
  }
}

