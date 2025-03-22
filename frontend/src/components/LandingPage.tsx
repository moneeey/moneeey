import { useNavigate } from "react-router-dom";
import useMessages from "../utils/Messages";
import { OkButton } from "./base/Button";
import LanguageSelector from "./LanguageSelector";
import MinimalBaseScreen from "./base/MinimalBaseScreen";

interface FeatureBalloonProps {
	title: string;
	description: string;
	delay: number;
}

type FeatureKey =
	| "encryption"
	| "privacy"
	| "local_data"
	| "online_sync"
	| "open_source"
	| "letter_budgeting";

interface Feature {
	key: FeatureKey;
	delay: number;
}

interface LandingMessages {
	title: string;
	messages: readonly string[];
	[key: string]: string | readonly string[];
}

const FeatureBalloon = ({ title, description, delay }: FeatureBalloonProps) => {
	return (
		<div
			style={{ animationDelay: `${delay}s` }}
			className="bg-background-600 rounded-lg shadow-lg p-6 max-w-sm hover:shadow-xl transition-all duration-300 animate-fade-in-up opacity-0 border border-primary-100 hover:border-primary-200"
		>
			<h3 className="text-xl font-semibold text-primary-300 mb-2">{title}</h3>
			<p className="text-gray-300">{description}</p>
		</div>
	);
};

export default function LandingPage() {
	const Messages = useMessages();
	const landing = Messages.landing as LandingMessages;
	const navigate = useNavigate();

	const featureList: Feature[] = [
		{
			key: "encryption",
			delay: 0.1,
		},
		{
			key: "privacy",
			delay: 0.2,
		},
		{
			key: "local_data",
			delay: 0.3,
		},
		{
			key: "online_sync",
			delay: 0.4,
		},
		{
			key: "open_source",
			delay: 0.5,
		},
		{
			key: "letter_budgeting",
			delay: 0.6,
		},
	];

	return (
		<MinimalBaseScreen>
			<div className="container mx-auto px-4 py-8">
				<div className="text-center mb-8 animate-fade-in">
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						{landing.messages[0]}
					</p>
				</div>

				<div className="flex justify-center mb-8">
					<LanguageSelector />
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
					{featureList.map((feature) => (
						<FeatureBalloon
							key={feature.key}
							title={landing[`${feature.key}_title`] as string}
							description={landing[`${feature.key}_description`] as string}
							delay={feature.delay}
						/>
					))}
				</div>

				<div className="flex  justify-center  animate-fade-in space-y-8" style={{ animationDelay: "0.7s" }}>
					<OkButton
						onClick={() => navigate("/dashboard")}
						className="text-xl py-4 px-8"
						title={landing.go_to_moneeey as string}
					/>
				</div>
			</div>
		</MinimalBaseScreen>
	);
};