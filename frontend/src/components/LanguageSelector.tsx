import useMessages, {
	type LanguageCode,
	useLanguageSwitcher,
} from "../utils/Messages";
import {
	IconBrazil,
	IconChina,
	IconIndia,
	IconSpain,
	IconUSA,
} from "./base/Icon";
import SegmentedControl from "./base/SegmentedControl";

type LanguageSelectorProps = {
	onSelect?: (language: LanguageCode) => void;
};

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
	const Messages = useMessages();
	const { currentLanguage, selectLanguage } = useLanguageSwitcher();

	const handleSelect = (lang: LanguageCode) => {
		if (onSelect) {
			return onSelect(lang);
		}
		selectLanguage(lang);
	};

	const options = [
		{
			value: "en" as const,
			icon: <IconUSA />,
			label: "EN",
			testId: "languageSelector_en",
		},
		{
			value: "cn" as const,
			icon: <IconChina />,
			label: "中文",
			testId: "languageSelector_cn",
		},
		{
			value: "hi" as const,
			icon: <IconIndia />,
			label: "हिंदी",
			testId: "languageSelector_hi",
		},
		{
			value: "es" as const,
			icon: <IconSpain />,
			label: "ES",
			testId: "languageSelector_es",
		},
		{
			value: "pt" as const,
			icon: <IconBrazil />,
			label: "PT",
			testId: "languageSelector_pt",
		},
	];

	return (
		<div className="flex flex-col justify-center items-center gap-2">
			<p className="text-sm font-medium text-muted">
				{Messages.settings.select_language}
			</p>
			<SegmentedControl
				options={options}
				value={currentLanguage}
				onChange={handleSelect}
			/>
		</div>
	);
}
