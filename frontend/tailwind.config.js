/** @type {import('tailwindcss').Config} */

import colors from "tailwindcss/colors";

export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: colors.green,
				secondary: colors.blue,
				background: colors.zinc,
				error: colors.red,
				warning: colors.yellow,
				success: colors.green,
				info: colors.blue,
			},
			keyframes: {
				"fade-in": {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				"fade-in-up": {
					"0%": { opacity: "0", transform: "translateY(20px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"fade-in": "fade-in 0.5s ease-out forwards",
				"fade-in-up": "fade-in-up 0.5s ease-out forwards",
			},
		},
		fontFamily: {
			sans: "PTSerif",
			mono: "PTMono",
		},
	},
	plugins: [],
};
