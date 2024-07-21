import { useState } from "react";
import MinimalBasicScreen from "../base/MinimalBaseScreen";
import Select from "../base/Select";
import { OkButton } from "../base/Button";
import useMessages from "../../utils/Messages";
import { TCurrencyUUID } from "../../entities/Currency";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import MoneeeyStore from "../../shared/MoneeeyStore";

export function showInitialCurrencySelector({ config }: MoneeeyStore) {
  return config.main.default_currency === ""
}

export default function InitialCurrencySelector() {
	const [defaultCurrency, setDefaultCurrency] = useState("" as TCurrencyUUID);
	const { currencies, config } = useMoneeeyStore();
	const Messages = useMessages();
	return (
		<MinimalBasicScreen>
			<p>{Messages.settings.default_currency}</p>
			<Select
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
			{defaultCurrency !== "" && (
				<OkButton
					title={Messages.tour.continue_currency}
					onClick={() => {
						config.merge({ ...config.main, default_currency: defaultCurrency });
					}}
				/>
			)}
		</MinimalBasicScreen>
	);
};
