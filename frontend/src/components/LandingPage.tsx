import { useNavigate } from "react-router-dom";
import useMessages from "../utils/Messages";

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
		<div className="min-h-screen bg-gradient-to-b from-background-600 via-background-700 to-background-800">
			<div className="container mx-auto px-4 py-16">
				<div className="text-center mb-16 animate-fade-in">
					<h1 className="text-4xl font-bold text-primary-300 mb-4">
						{landing.title}
					</h1>
					<p className="text-xl text-gray-300 max-w-2xl mx-auto">
						{landing.messages[0]}
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
					{featureList.map((feature) => (
						<FeatureBalloon
							key={feature.key}
							title={landing[`${feature.key}_title`] as string}
							description={landing[`${feature.key}_description`] as string}
							delay={feature.delay}
						/>
					))}
				</div>

				<div
					className="text-center animate-fade-in"
					style={{ animationDelay: "0.7s" }}
				>
					<button
						onClick={() => navigate("/dashboard")}
						className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-8 rounded-lg text-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
					>
						Go to Moneeey
					</button>
				</div>
			</div>
		</div>
	);
}
