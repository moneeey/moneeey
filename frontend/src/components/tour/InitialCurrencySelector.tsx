import { useState } from "react";
import type { IConfig } from "../../entities/Config";
import type { TCurrencyUUID } from "../../entities/Currency";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";
import { OkButton } from "../base/Button";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import Select from "../base/Select";

export function showInitialCurrencySelector({
	default_currency,
}: Pick<IConfig, "default_currency">) {
	return default_currency === "";
}

export default function InitialCurrencySelector() {
	const [defaultCurrency, setDefaultCurrency] = useState("" as TCurrencyUUID);
	const { currencies, config } = useMoneeeyStore();
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<p>{Messages.settings.default_currency}</p>
			<Select
				containerArea
				testId="defaultCurrencySelector"
				placeholder={Messages.settings.select_default_currency}
				value={defaultCurrency}
				options={currencies.all.map((currency) => ({
					label: (
						<span>
							<b>{currency.short}</b> {currency.name}
						</span>
					),
					value: currency.currency_uuid,
				}))}
				onChange={(value: string) => setDefaultCurrency(value)}
			/>
			<OkButton
				disabled={defaultCurrency === ""}
				title={Messages.tour.continue_currency}
				onClick={() => {
					config.merge({ ...config.main, default_currency: defaultCurrency });
				}}
			/>
		</MinimalBasicScreen>
	);
}
