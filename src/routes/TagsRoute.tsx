import React from 'react';

import TransactionTable from '../app/TransactionTable';
import { HomeRoute } from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

interface ITagsRoute extends IRouteParameters {
  tag: string;
}

class TagsRouter extends Route<ITagsRoute> {
  constructor() {
    super('/tags/:tag', HomeRoute);
    this.parent?.addChild(this);
  }

  render(parameters: ITagsRoute, app: IAppParameters) {
    const transactions = app.moneeeyStore.transactions.viewAllWithTag(parameters.tag, app.moneeeyStore.accounts);
    return <TransactionTable transactions={transactions} referenceAccount={''} />;
  }

  tagsUrl(tag: string) {
    return this.url({ tag });
  }
}

export const TagsRoute = new TagsRouter();
