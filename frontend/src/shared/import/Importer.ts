import { compact, filter, flatten, isEmpty, keys } from 'lodash';

import { AccountKind, TAccountUUID } from '../../entities/Account';
import { ITransaction } from '../../entities/Transaction';
import { tokenize } from '../../utils/Utils';
import { EntityType } from '../Entity';
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
  getAllTransactionTags: (transaction: ITransaction) => string[],
  sampleSize: number
): ScoreMap {
  const accountsAndTokens = transactions.map((t) => ({
    tokens: tokensForTransactions(t, getAllTransactionTags),
    accounts: compact([t.from_account, t.to_account]),
  }));

  const allTokens = accountsAndTokens.flatMap((aat) => aat.tokens);
  const scoreMap = tokenScoreMap(allTokens);

  const topAccountTokens = accountsAndTokens.map((aat) => ({
    ...aat,
    tokens: tokenTopScores(aat.tokens, scoreMap, 5),
  }));

  const topAccountScoreMap = topAccountTokens.reduce((accum, aat) => {
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

  keys(topAccountScoreMap).forEach((id) => {
    const scores = topAccountScoreMap[id];
    keys(scores)
      .map((token) => ({ token, score: scores[token] }))
      .sort((a, b) => b.score - a.score)
      .slice(sampleSize)
      .forEach((smallScore) => {
        delete topAccountScoreMap[id][smallScore.token];
      });
  });

  return topAccountScoreMap;
};

export const tokenMatchScoreMap = function (tokens: string[], scoreMap: ScoreMap, sampleSize: number) {
  return keys(scoreMap)
    .map((id) => {
      let score = 0;
      let first = true;
      const scores = scoreMap[id] || {};
      tokens.forEach((token) => {
        if (token in scores) {
          score += scores[token];
          if (first) {
            first = false;
          } else {
            score /= 2;
          }
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
    return tokenTransactionAccountScoreMap(this.moneeeyStore.transactions.all, (t) => t.tags.flatMap(tokenize), 10);
  }

  findAccountsForTokens(referenceAccount: TAccountUUID, tokenMap: ScoreMap, tokens: string[]) {
    const allTokenized = compact(flatten(tokens.map((s) => tokenize(s))));
    const matchingTransactionAccounts = tokenMatchScoreMap(allTokenized, tokenMap, 10);
    const nonReferenceAccount = filter(
      flatten(matchingTransactionAccounts),
      (match) => !isEmpty(match.id) && match.id !== referenceAccount
    );

    const accountScore = (account_uuid: TAccountUUID) =>
      this.moneeeyStore.accounts.byUuid(account_uuid)?.kind === AccountKind.PAYEE ? 0 : -0.1;

    return nonReferenceAccount
      .map((match) => ({
        account_uuid: match.id,
        name: this.moneeeyStore.accounts.nameForUuid(match.id),
        score: match.score + accountScore(match.id),
      }))
      .sort((a, b) => b.score - a.score);
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
