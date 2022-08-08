import React from 'react';
import { ITransaction } from '../shared/Transaction';

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
    const { transactions, accounts, currencies } = app.moneeeyStore
    const filterByTag = transactions.filterByTag(parameters.tag, accounts)
    const schemaFilter = (_sp: any, row: ITransaction) => filterByTag(row)
    const referenceAccount = ''
    return <TransactionTable {...{ transactions, accounts, currencies, schemaFilter, referenceAccount }} />;
  }

  tagsUrl(tag: string) {
    return this.url({ tag });
  }
}

export const TagsRoute = new TagsRouter();
