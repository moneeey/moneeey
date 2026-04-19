/** @type {import('tailwindcss').Config} */

import colors from "tailwindcss/colors";

const bgShade = (n) => `rgb(var(--bg-${n}) / <alpha-value>)`;

export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: colors.green,
				secondary: colors.blue,
				danger: colors.red,
				background: {
					50: bgShade(50),
					100: bgShade(100),
					200: bgShade(200),
					300: bgShade(300),
					400: bgShade(400),
					500: bgShade(500),
					600: bgShade(600),
					700: bgShade(700),
					800: bgShade(800),
					900: bgShade(900),
					950: bgShade(950),
				},
				foreground: "rgb(var(--text-default) / <alpha-value>)",
				muted: "rgb(var(--text-muted) / <alpha-value>)",
				positive: "rgb(var(--text-positive) / <alpha-value>)",
				negative: "rgb(var(--text-negative) / <alpha-value>)",
				error: colors.red,
				warning: colors.yellow,
				success: colors.green,
				info: colors.blue,
				"notif-success-bg": "rgb(var(--notif-success-bg) / <alpha-value>)",
				"notif-success-fg": "rgb(var(--notif-success-fg) / <alpha-value>)",
				"notif-info-bg": "rgb(var(--notif-info-bg) / <alpha-value>)",
				"notif-info-fg": "rgb(var(--notif-info-fg) / <alpha-value>)",
				"notif-warning-bg": "rgb(var(--notif-warning-bg) / <alpha-value>)",
				"notif-warning-fg": "rgb(var(--notif-warning-fg) / <alpha-value>)",
				"notif-error-bg": "rgb(var(--notif-error-bg) / <alpha-value>)",
				"notif-error-fg": "rgb(var(--notif-error-fg) / <alpha-value>)",
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
			sans: "'PTSerif', Georgia, 'Times New Roman', serif",
			mono: "'PTMono', 'Courier New', Courier, monospace",
		},
	},
	plugins: [],
};
