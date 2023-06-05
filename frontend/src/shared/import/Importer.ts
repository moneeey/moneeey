import { compact, filter, flatten, isEmpty, keys } from 'lodash';

import { AccountKind, TAccountUUID } from '../../entities/Account';
import { ITransaction } from '../../entities/Transaction';
import { tokenize } from '../../utils/Utils';
import MoneeeyStore from '../MoneeeyStore';

export const tokenWeightMap = function (tokens: string[]): Map<string, number> {
  const scores = new Map<string, number>();
  tokens.forEach((token) => scores.set(token, (scores.get(token) || 0) + 1));
  scores.forEach((frequency, token) => scores.set(token, 1 - frequency / tokens.length));

  return scores;
};

export const tokenTopScores = function (
  tokens: string[],
  scores: Map<string, number>
): { token: string; score: number }[] {
  return Array.from(new Set(tokens).values())
    .map((token) => ({
      token,
      score: scores.get(token) || 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
};

export const tokensForTransactions = function (transaction: ITransaction) {
  return compact(
    flatten([...tokenize(transaction.memo), ...tokenize(transaction.import_data), ...transaction.tags.map(tokenize)])
  ).filter((token) => token.length > 2);
};

type ScoreMap = { [id: string]: { [token: string]: number } };

export const tokenTransactionAccountScoreMap = function (transactions: ITransaction[]): ScoreMap {
  const allAccountTokens = transactions.reduce((rs, t) => {
    const tokens = tokensForTransactions(t);
    const accounts = compact([t.from_account, t.to_account]);
    accounts.forEach((account_uuid) => rs.set(account_uuid, [...(rs.get(account_uuid) || []), ...tokens]));

    return rs;
  }, new Map<TAccountUUID, string[]>());

  const weightMap = tokenWeightMap(flatten(Array.from(allAccountTokens.values())));

  return Array.from(allAccountTokens.entries()).reduce((rs, [account_uuid, tokens]) => {
    const topScores = tokenTopScores(tokens, weightMap);

    const scores = topScores.reduce((rs, score) => ({ ...rs, [score.token]: score.score }), {});

    return { ...rs, [account_uuid]: scores };
  }, {} as ScoreMap);
};

export const tokenMatchScoreMap = function (tokens: string[], scoreMap: ScoreMap) {
  return keys(scoreMap)
    .map((id) => {
      const accountTokenScores = scoreMap[id] || {};
      const domain = keys(accountTokenScores).length;
      const scores = tokens.map((token) => accountTokenScores[token] || 0);
      const total = scores.reduce((a, b) => a + b, 0);
      const matching = scores.filter((s) => s > 0).length;
      const match = tokens
        .map((token, idx) => ({ token, score: scores[idx] }))
        .filter((m) => m.score > 0)
        .reduce((rs, m) => ({ ...rs, [m.token]: m.score }), {});

      return {
        id,
        total,
        matching,
        domain,
        score: matching + total / domain,
        match,
      };
    })
    .filter((si) => si.score > 0)
    .sort((a, b) => b.score - a.score);
};

class Importer {
  private moneeeyStore: MoneeeyStore;

  constructor(moneeeyStore: MoneeeyStore) {
    this.moneeeyStore = moneeeyStore;
  }

  get tokenMap() {
    return tokenTransactionAccountScoreMap(this.moneeeyStore.transactions.all);
  }

  findAccountsForTokens(referenceAccount: TAccountUUID, tokenMap: ScoreMap, tokens: string[]) {
    const allTokenized = compact(flatten(tokens.map((s) => tokenize(s))));
    const matchingTransactionAccounts = tokenMatchScoreMap(allTokenized, tokenMap);
    const nonReferenceAccount = filter(
      flatten(matchingTransactionAccounts),
      (match) => !isEmpty(match.id) && match.id !== referenceAccount
    );

    const accountScore = (account_uuid: TAccountUUID) =>
      this.moneeeyStore.accounts.byUuid(account_uuid)?.kind === AccountKind.PAYEE ? 0 : -0.1;

    return nonReferenceAccount
      .map(({ id: account_uuid, ...rest }) => ({
        ...rest,
        account_uuid,
        name: this.moneeeyStore.accounts.nameForUuid(account_uuid),
        score: rest.score + accountScore(account_uuid),
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
