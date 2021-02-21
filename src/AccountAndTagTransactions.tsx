import React from "react";
import { Breadcrumb, Space } from "antd";
import MoneeeyStore from "./MoneeeyStore";
import { NavigationArea } from "./Navigation";
import TransactionTable from "./TransactionTable";
import { Observe } from "./Observable";
import { HomeOutlined } from "@ant-design/icons";

export default function AccountAndTagTransactions({
  moneeeyStore,
}: {
  moneeeyStore: MoneeeyStore;
}) {
  const getTransactions = () => {
    if (moneeeyStore.navigation.area === NavigationArea.AccountTransactions) {
      return moneeeyStore.transactions.viewAllWithAccount(
        moneeeyStore.navigation.referenceAccount
      );
    } else if (
      moneeeyStore.navigation.area === NavigationArea.TagTransactions
    ) {
      return moneeeyStore.transactions.viewAllWithTag(
        moneeeyStore.navigation.detail,
        moneeeyStore.accounts
      );
    } else {
      return [];
    }
  };
  const getReferenceAccountName = () => {
    const referenceAccount = moneeeyStore.navigation.referenceAccount;
    if (referenceAccount) {
      const acct = moneeeyStore.accounts.byUuid(referenceAccount);
      if (acct) {
        return acct.name;
      }
    }
    return "";
  };
  return (
    <Observe subject={moneeeyStore.navigation}>
      {(_changedNavigation) => (
        <Observe subject={moneeeyStore.transactions}>
          {(_changedTransaction) => (
            <>
              <Breadcrumb>
                <Breadcrumb.Item
                  onClick={() =>
                    moneeeyStore.navigation.navigate(
                      NavigationArea.AccountTransactions,
                      moneeeyStore.navigation.referenceAccount
                    )
                  }
                >
                  <Space>
                    <HomeOutlined />
                    {getReferenceAccountName()}
                  </Space>
                </Breadcrumb.Item>
                {moneeeyStore.navigation.area ===
                  NavigationArea.TagTransactions && (
                  <Breadcrumb.Item
                    onClick={() =>
                      moneeeyStore.navigation.navigate(
                        NavigationArea.TagTransactions
                      )
                    }
                  >
                    #{moneeeyStore.navigation.detail}
                  </Breadcrumb.Item>
                )}
              </Breadcrumb>
              <TransactionTable
                moneeeyStore={moneeeyStore}
                transactions={getTransactions()}
              />
            </>
          )}
        </Observe>
      )}
    </Observe>
  );
}
