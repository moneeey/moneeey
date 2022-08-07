import React from 'react';

import TransactionTable from '../tables/TransactionTable';
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

  render({ app, parameters}: { app: IAppParameters, parameters: ITagsRoute }) {
    const transactions = app.moneeeyStore.transactions.viewAllWithTag(parameters.tag, app.moneeeyStore.accounts);
    return <TransactionTable transactions={transactions} referenceAccount={''} />;
  }

  tagsUrl(tag: string) {
    return this.url({ tag });
  }
}

export const TagsRoute = new TagsRouter();
