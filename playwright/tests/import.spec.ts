import { expect, test } from "@playwright/test";
import { formatDate } from "../../frontend/src/utils/Date";
import {
	ALL_TRANSACTIONS_COLUMNS,
	closeTourModal,
	completeLandingWizard,
	IMPORT_COLUMNS,
	OpenMenuItem,
	resetAppState,
	retrieveRowsData,
	Select,
	waitLoading,
} from "../helpers";

test.beforeEach(async ({ page }) => {
	await resetAppState(page);
});

test("Import CSV and OFX, map accounts, merge with existing data", async ({
	page,
}) => {
	await completeLandingWizard(page);
	await closeTourModal(page);

	await OpenMenuItem(page, "Import");

	const importFile = async (fileName: string) => {
		await page.getByTestId("importFile").setInputFiles(`./fixture/${fileName}`);
		await expect(
			page.getByText(fileName.substring(fileName.lastIndexOf("/"))).first(),
		).toBeVisible();
		await waitLoading(page);
	};

	const updateEditorTos = async (options: Array<string | null>) => {
		for (const { option, index } of options.map((option, index) => ({
			option,
			index,
		}))) {
			if (option) {
				const sel = Select(page, "editorTo", index);
				await sel.chooseOrCreate(option);
				expect(await sel.value()).toContain(option);
			}
		}
	};

	// Import CSV
	await importFile("bank_statement_a.csv");
	await waitLoading(page);
	expect(await retrieveRowsData(page, IMPORT_COLUMNS, 6)).toEqual([
		"date: 2015-02-01 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 100,1 (bg---800) | memo: 2015-02-01;Auto Posto Aurora;-100.10 (bg---800)",
		"date: 2015-02-01 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 20,2 (bg---600) | memo: 2015-02-01;Padaria;-20.20 (bg---600)",
		"date: 2015-02-03 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 30,3 (bg---800) | memo: 2015-02-03;Restaurante Sorocaba;-30.30 (bg---800)",
		"date: 2015-02-04 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 40,4 (bg---600) | memo: 2015-02-04;Lava Jato - Carros;-40.40 (bg---600)",
		"date: 2015-02-06 (bg---800) | from: Banco Moneeey (bg---800) | to: To (bg---800 bg-green-900) | amount: 57,52 (bg---800) | memo: 2015-02-06;Gas Station;-57.52 (bg---800)",
		"date: 2015-02-07 (bg---600) | from: Banco Moneeey (bg---600) | to: To (bg---600 bg-green-950) | amount: 50,5 (bg---600) | memo: 2015-02-07;Transfer;-50.50 (bg---600)",
	]);

	// Map imported rows to target accounts
	await updateEditorTos([
		"Gas",
		"Bakery",
		"Restaurant",
		"Car Wash",
		"Gas",
		"MoneeeyCard",
	]);

	expect(await retrieveRowsData(page, ["editorTo"], 6)).toEqual([
		"to: Gas (bg---800)",
		"to: Bakery (bg---600)",
		"to: Restaurant (bg---800)",
		"to: Car Wash (bg---600)",
		"to: Gas (bg---800)",
		"to: MoneeeyCard (bg---600)",
	]);
	await page.getByTestId("primary-button").click();

	// Import OFX — pick target account
	const targetAccountSelect = Select(page, "target_account");
	expect(await targetAccountSelect.options()).toEqual([
		"Banco Moneeey",
		"MoneeeyCard",
		"Bitcoinss",
	]);
	await targetAccountSelect.choose("MoneeeyCard");
	await importFile("bank_statement_b.ofx");
	await waitLoading(page);

	// OFX with duplicate detection — first row shows cyan/fuchsia highlight
	expect(await retrieveRowsData(page, IMPORT_COLUMNS, 5)).toEqual([
		"date: 2015-02-07 (bg---800 bg-cyan-900) | from: Banco Moneeey (bg---800 bg-cyan-900) | to: MoneeeyCard (bg---800 bg-cyan-900) | amount: 50,5 (bg---800 bg-cyan-900) | memo: 2015-02-07;Transfer;-50.50;50.50  FromMyOtherAccount Transfer from savings  2015-02-07 (bg---800 bg-fuchsia-900)",
		"date: 2015-02-10 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 60,6 (bg---600) | memo: -60.60  Drogaria Drogas 420 Pharmacy purchase  2015-02-10 (bg---600)",
		"date: 2015-02-10 (bg---800) | from: MoneeeyCard (bg---800) | to: Restaurant (bg---800) | amount: 70,7 (bg---800) | memo: -70.70  Restaurante Monteiro Dining out  2015-02-10 (bg---800)",
		"date: 2015-02-11 (bg---600) | from: MoneeeyCard (bg---600) | to: To (bg---600 bg-green-950) | amount: 80,8 (bg---600) | memo: -80.80  Mercado Bom Preco Grocery shopping  2015-02-11 (bg---600)",
		"date: 2015-02-17 (bg---800) | from: MoneeeyCard (bg---800) | to: Car Wash (bg---800) | amount: 90,9 (bg---800) | memo: -90.90  Lava Jato Eco Car wash  2015-02-17 (bg---800)",
	]);
	await updateEditorTos([null, "Pharmacy", null, "Groceries", null]);
	expect(await retrieveRowsData(page, ["editorTo"], 5)).toEqual([
		"to: MoneeeyCard (bg---800 bg-cyan-900)",
		"to: Pharmacy (bg---600)",
		"to: Restaurant (bg---800)",
		"to: Groceries (bg---600)",
		"to: Car Wash (bg---800)",
	]);

	await page.getByTestId("primary-button").click();

	// Verify the merged transaction list
	await OpenMenuItem(page, "All transactions");
	const today = formatDate(new Date());
	expect(await retrieveRowsData(page, ALL_TRANSACTIONS_COLUMNS, 14)).toEqual([
		"date: 2015-02-01 (bg---800) | from: Banco Moneeey (bg---800) | to: Gas (bg---800) | amount: 100,1 (bg---800) | memo: 2015-02-01;Auto Posto Aurora;-100.10 (bg---800)",
		"date: 2015-02-01 (bg---600) | from: Banco Moneeey (bg---600) | to: Bakery (bg---600) | amount: 20,2 (bg---600) | memo: 2015-02-01;Padaria;-20.20 (bg---600)",
		"date: 2015-02-03 (bg---800) | from: Banco Moneeey (bg---800) | to: Restaurant (bg---800) | amount: 30,3 (bg---800) | memo: 2015-02-03;Restaurante Sorocaba;-30.30 (bg---800)",
		"date: 2015-02-04 (bg---600) | from: Banco Moneeey (bg---600) | to: Car Wash (bg---600) | amount: 40,4 (bg---600) | memo: 2015-02-04;Lava Jato - Carros;-40.40 (bg---600)",
		"date: 2015-02-06 (bg---800) | from: Banco Moneeey (bg---800) | to: Gas (bg---800) | amount: 57,52 (bg---800) | memo: 2015-02-06;Gas Station;-57.52 (bg---800)",
		"date: 2015-02-07 (bg---600) | from: Banco Moneeey (bg---600) | to: MoneeeyCard (bg---600) | amount: 50,5 (bg---600) | memo: 2015-02-07;Transfer;-50.50;50.50  FromMyOtherAccount Transfer from savings  2015-02-07 (bg---600)",
		"date: 2015-02-10 (bg---800) | from: MoneeeyCard (bg---800) | to: Pharmacy (bg---800) | amount: 60,6 (bg---800) | memo: -60.60  Drogaria Drogas 420 Pharmacy purchase  2015-02-10 (bg---800)",
		"date: 2015-02-10 (bg---600) | from: MoneeeyCard (bg---600) | to: Restaurant (bg---600) | amount: 70,7 (bg---600) | memo: -70.70  Restaurante Monteiro Dining out  2015-02-10 (bg---600)",
		"date: 2015-02-11 (bg---800) | from: MoneeeyCard (bg---800) | to: Groceries (bg---800) | amount: 80,8 (bg---800) | memo: -80.80  Mercado Bom Preco Grocery shopping  2015-02-11 (bg---800)",
		"date: 2015-02-17 (bg---600) | from: MoneeeyCard (bg---600) | to: Car Wash (bg---600) | amount: 90,9 (bg---600) | memo: -90.90  Lava Jato Eco Car wash  2015-02-17 (bg---600)",
		`date: ${today} (bg---800) | from: Initial balance BRL (bg---800) | to: Banco Moneeey (bg---800) | amount: 1.234,56 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: Initial balance BRL (bg---600) | to: MoneeeyCard (bg---600) | amount: 2.000 (bg---600) | memo:  (bg---600)`,
		`date: ${today} (bg---800) | from: Initial balance BTC (bg---800) | to: Bitcoinss (bg---800) | amount: 0,12345678 (bg---800) | memo:  (bg---800)`,
		`date: ${today} (bg---600) | from: From (bg---600) | to: To (bg---600) | amount: 0 (bg---600) | memo:  (bg---600)`,
	]);
});
