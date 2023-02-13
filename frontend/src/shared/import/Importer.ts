import {
  compact,
  filter,
  flatten,
  groupBy,
  head,
  identity,
  includes,
  isEmpty,
  keys,
  reduce,
  reverse,
  sortBy,
  uniq,
  values,
} from 'lodash';

import { TAccountUUID } from '../../entities/Account';
import { ITransaction } from '../../entities/Transaction';
import { tokenize } from '../../utils/Utils';
import MoneeeyStore from '../MoneeeyStore';

export const tokenScoreMap = function (tokens: string[]): Map<string, number> {
  const scores = new Map<string, number>();
  tokens.forEach((token) => scores.set(token, (scores.get(token) || 0) + 1));
  scores.forEach((frequency, token) => scores.set(token, 1 - frequency / tokens.length));

  return scores;
};

export const tokenTopScores = function (
  tokens: string[],
  scores: Map<string, number>,
  sampleSize: number
): { token: string; score: number }[] {
  return Array.from(new Set(tokens).values())
    .map((token) => ({
      token,
      score: scores.get(token) || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, sampleSize);
};

export const tokensForTransactions = function (
  transaction: ITransaction,
  getAllTransactionTags: (transaction: ITransaction) => string[]
) {
  return compact(
    flatten([
      ...getAllTransactionTags(transaction),
      ...tokenize(transaction.memo),
      ...tokenize(transaction.import_data),
    ])
  );
};

type ScoreMap = { [id: string]: { [token: string]: number } };

export const tokenTransactionAccountScoreMap = function (
  transactions: ITransaction[],
  getAllTransactionTags: (transaction: ITransaction) => string[]
): ScoreMap {
  const accountsAndTokens = transactions.map((t) => ({
    tokens: tokensForTransactions(t, getAllTransactionTags),
    accounts: compact([t.from_account, t.to_account]),
  }));

  const allTokens = accountsAndTokens.flatMap((aat) => aat.tokens);
  const scoreMap = tokenScoreMap(allTokens);

  const topAccountTokens = accountsAndTokens.map((aat) => ({
    ...aat,
    tokens: tokenTopScores(aat.tokens, scoreMap, 2),
  }));

  return topAccountTokens.reduce((accum, aat) => {
    aat.accounts.forEach((account) => {
      const accountTokens = accum[account] || {};
      aat.tokens.forEach((st) => {
        if (st.token in accountTokens) {
          accountTokens[st.token] += st.score;
          accountTokens[st.token] /= 2;
        } else {
          accountTokens[st.token] = st.score;
        }
      });
      accum[account] = accountTokens;
    });

    return accum;
  }, {} as ScoreMap);
};

export const tokenMatchScoreMap = function (tokens: string[], scoreMap: ScoreMap, sampleSize: number) {
  return keys(scoreMap)
    .map((id) => {
      let score = 0;
      const scores = scoreMap[id] || {};
      tokens.forEach((token) => {
        if (token in scores) {
          score += scores[token];
        }
      });

      return { id, score };
    })
    .filter((si) => si.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, sampleSize);
};

class Importer {
  private moneeeyStore: MoneeeyStore;

  constructor(moneeeyStore: MoneeeyStore) {
    this.moneeeyStore = moneeeyStore;
  }

  get tokenMap() {
    const tokenMap = this.moneeeyStore.transactions.all.reduce((accum, transaction) => {
      const tokens = uniq(
        compact(flatten([...transaction.tags, ...tokenize(transaction.memo), ...tokenize(transaction.import_data)]))
      );
      accum.set(transaction, tokens);

      return accum;
    }, new Map<ITransaction, string[]>());

    return tokenMap;
  }

  findAccountsForTokens(referenceAccount: TAccountUUID, tokenMap: Map<ITransaction, string[]>, _tokens: string[]) {
    const MAX_MATCH = 100;
    const tokens = compact(flatten(_tokens.map((s) => tokenize(s))));
    let maxCommons = 0;
    const matchingTransactions = reduce(
      Array.from(tokenMap.entries()),
      (results, [transaction, transactionTokens]) => {
        if (results.length < MAX_MATCH) {
          const common: string[] = transactionTokens.filter((tok) => includes(tokens, tok));
          if (common.length > 0) {
            results.push({ transaction, common });
            maxCommons = Math.max(maxCommons, common.length);
          }
        }

        return results;
      },
      [] as { transaction: ITransaction; common: string[] }[]
    );
    const filterNonReferenceAccount = (account_uuid: TAccountUUID) =>
      !isEmpty(account_uuid) && account_uuid !== referenceAccount;
    const matchingTransactionAccounts = matchingTransactions
      .filter((m) => m.common.length >= maxCommons)
      .map((m) => [m.transaction.from_account, m.transaction.to_account]);
    const nonReferenceAccount = filter(flatten(matchingTransactionAccounts), filterNonReferenceAccount);
    const mostMatchedFirst = uniq(reverse(sortBy(values(groupBy(nonReferenceAccount, identity)), (v) => v.length)));
    const mostMatched = compact(mostMatchedFirst.map(head)).map((account_uuid) => ({
      account_uuid,
      name: this.moneeeyStore.accounts.nameForUuid(account_uuid),
    }));

    return mostMatched.map((m) => m.account_uuid);
  }

  findForImportId(import_id: string[]) {
    return this.moneeeyStore.transactions.all.find((t) => {
      const tids = this.importId(t);

      return import_id.find((id) => tids.includes(id));
    });
  }

  importId(transaction: ITransaction) {
    return compact([transaction.from_account, transaction.to_account])
      .sort()
      .map((account) => `date=${transaction.date} account=${account} value=${transaction.from_value}`);
  }
}

export { Importer, Importer as default };
