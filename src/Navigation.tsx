import { isValid } from "date-fns";
import { formatDateAs, TDate } from "./Date";
import Observable from "./Observable";

export default class NavigationStore extends Observable<string> {
  dateFormat = "dd/MM/yyyy";

  formatDate(date: TDate) {
    if (isValid(date)) {
      return formatDateAs(date, this.dateFormat);
    } else {
      return date;
    }
  }

  navigate(url: string) {
    this.dispatch(url);
  }
}
