import type { ReactNode } from "react";

import favicon from "../../favicon.svg";
import useMessages from "../../utils/Messages";

import type { WithDataTestId } from "./Common";

export default function Icon({
	children,
	className,
	testId,
	onClick,
}: {
	children: ReactNode | ReactNode[];
	className?: string;
	onClick?: () => void;
} & Partial<WithDataTestId>) {
	return (
		<div
			className={`h-4 w-4 ${className || ""}`}
			data-testid={testId}
			onClick={onClick}
			onKeyDown={onClick}
		>
			{children}
		</div>
	);
}

export const FavIcon = () => {
	const Messages = useMessages();
	return (
		<Icon className="h-6 w-6">
			<img src={favicon} alt={Messages.menu.title} />
		</Icon>
	);
};

/* Flag SVGs from https://github.com/HatScripts/circle-flags/tree/gh-pages distributed under MIT */
export const IconBrazil = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		aria-label="Brazil"
		role="img"
	>
		<mask id="a">
			<circle cx="256" cy="256" r="256" fill="#fff" />
		</mask>
		<g mask="url(#a)">
			<path fill="#6da544" d="M0 0h512v512H0z" />
			<path fill="#ffda44" d="M256 100.2 467.5 256 256 411.8 44.5 256z" />
			<path
				fill="#eee"
				d="M174.2 221a87 87 0 0 0-7.2 36.3l162 49.8a88.5 88.5 0 0 0 14.4-34c-40.6-65.3-119.7-80.3-169.1-52z"
			/>
			<path
				fill="#0052b4"
				d="M255.7 167a89 89 0 0 0-41.9 10.6 89 89 0 0 0-39.6 43.4 181.7 181.7 0 0 1 169.1 52.2 89 89 0 0 0-9-59.4 89 89 0 0 0-78.6-46.8zM212 250.5a149 149 0 0 0-45 6.8 89 89 0 0 0 10.5 40.9 89 89 0 0 0 120.6 36.2 89 89 0 0 0 30.7-27.3A151 151 0 0 0 212 250.5z"
			/>
		</g>
	</svg>
);

export const IconUSA = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		aria-label="USA"
		role="img"
	>
		<mask id="a">
			<circle cx="256" cy="256" r="256" fill="#fff" />
		</mask>
		<g mask="url(#a)">
			<path
				fill="#eee"
				d="M256 0h256v64l-32 32 32 32v64l-32 32 32 32v64l-32 32 32 32v64l-256 32L0 448v-64l32-32-32-32v-64z"
			/>
			<path
				fill="#d80027"
				d="M224 64h288v64H224Zm0 128h288v64H256ZM0 320h512v64H0Zm0 128h512v64H0Z"
			/>
			<path fill="#0052b4" d="M0 0h256v256H0Z" />
			<path
				fill="#eee"
				d="m187 243 57-41h-70l57 41-22-67zm-81 0 57-41H93l57 41-22-67zm-81 0 57-41H12l57 41-22-67zm162-81 57-41h-70l57 41-22-67zm-81 0 57-41H93l57 41-22-67zm-81 0 57-41H12l57 41-22-67Zm162-82 57-41h-70l57 41-22-67Zm-81 0 57-41H93l57 41-22-67zm-81 0 57-41H12l57 41-22-67Z"
			/>
		</g>
	</svg>
);

export const IconSpain = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		aria-label="Spain"
		role="img"
	>
		<mask id="a">
			<circle cx="256" cy="256" r="256" fill="#fff" />
		</mask>
		<g mask="url(#a)">
			<path fill="#ffda44" d="m0 128 256-32 256 32v256l-256 32L0 384Z" />
			<path fill="#d80027" d="M0 0h512v128H0zm0 384h512v128H0z" />
			<g fill="#eee">
				<path d="M144 304h-16v-80h16zm128 0h16v-80h-16z" />
				<ellipse cx="208" cy="296" rx="48" ry="32" />
			</g>
			<g fill="#d80027">
				<rect width="16" height="24" x="128" y="192" rx="8" />
				<rect width="16" height="24" x="272" y="192" rx="8" />
				<path d="M208 272v24a24 24 0 0 0 24 24 24 24 0 0 0 24-24v-24h-24z" />
			</g>
			<rect width="32" height="16" x="120" y="208" fill="#ff9811" ry="8" />
			<rect width="32" height="16" x="264" y="208" fill="#ff9811" ry="8" />
			<rect width="32" height="16" x="120" y="304" fill="#ff9811" rx="8" />
			<rect width="32" height="16" x="264" y="304" fill="#ff9811" rx="8" />
			<path
				fill="#ff9811"
				d="M160 272v24c0 8 4 14 9 19l5-6 5 10a21 21 0 0 0 10 0l5-10 5 6c6-5 9-11 9-19v-24h-9l-5 8-5-8h-10l-5 8-5-8z"
			/>
			<path d="M122 252h172m-172 24h28m116 0h28" />
			<path
				fill="#d80027"
				d="M122 248a4 4 0 0 0-4 4 4 4 0 0 0 4 4h172a4 4 0 0 0 4-4 4 4 0 0 0-4-4zm0 24a4 4 0 0 0-4 4 4 4 0 0 0 4 4h28a4 4 0 0 0 4-4 4 4 0 0 0-4-4zm144 0a4 4 0 0 0-4 4 4 4 0 0 0 4 4h28a4 4 0 0 0 4-4 4 4 0 0 0-4-4z"
			/>
			<path
				fill="#eee"
				d="M196 168c-7 0-13 5-15 11l-5-1c-9 0-16 7-16 16s7 16 16 16c7 0 13-4 15-11a16 16 0 0 0 17-4 16 16 0 0 0 17 4 16 16 0 1 0 10-20 16 16 0 0 0-27-5c-3-4-7-6-12-6zm0 8c5 0 8 4 8 8 0 5-3 8-8 8-4 0-8-3-8-8 0-4 4-8 8-8zm24 0c5 0 8 4 8 8 0 5-3 8-8 8-4 0-8-3-8-8 0-4 4-8 8-8zm-44 10 4 1 4 8c0 4-4 7-8 7s-8-3-8-8c0-4 4-8 8-8zm64 0c5 0 8 4 8 8 0 5-3 8-8 8-4 0-8-3-8-7l4-8z"
			/>
			<path fill="none" d="M220 284v12c0 7 5 12 12 12s12-5 12-12v-12z" />
			<path fill="#ff9811" d="M200 160h16v32h-16z" />
			<path fill="#eee" d="M208 224h48v48h-48z" />
			<path
				fill="#d80027"
				d="m248 208-8 8h-64l-8-8c0-13 18-24 40-24s40 11 40 24zm-88 16h48v48h-48z"
			/>
			<rect
				width="20"
				height="32"
				x="222"
				y="232"
				fill="#d80027"
				rx="10"
				ry="10"
			/>
			<path
				fill="#ff9811"
				d="M168 232v8h8v16h-8v8h32v-8h-8v-16h8v-8zm8-16h64v8h-64z"
			/>
			<g fill="#ffda44">
				<circle cx="186" cy="202" r="6" />
				<circle cx="208" cy="202" r="6" />
				<circle cx="230" cy="202" r="6" />
			</g>
			<path
				fill="#d80027"
				d="M169 272v43a24 24 0 0 0 10 4v-47h-10zm20 0v47a24 24 0 0 0 10-4v-43h-10z"
			/>
			<g fill="#338af3">
				<circle cx="208" cy="272" r="16" />
				<rect width="32" height="16" x="264" y="320" ry="8" />
				<rect width="32" height="16" x="120" y="320" ry="8" />
			</g>
		</g>
	</svg>
);

export const IconChina = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		aria-label="China"
		role="img"
	>
		<mask id="a">
			<circle cx="256" cy="256" r="256" fill="#fff" />
		</mask>
		<g mask="url(#a)">
			<path fill="#d80027" d="M0 0h512v512H0z" />
			<path
				fill="#ffda44"
				d="m140.1 155.8 22.1 68h71.5l-57.8 42.1 22.1 68-57.9-42-57.9 42 22.2-68-57.9-42.1H118zm163.4 240.7-16.9-20.8-25 9.7 14.5-22.5-16.9-20.9 25.9 6.9 14.6-22.5 1.4 26.8 26 6.9-25.1 9.6zm33.6-61 8-25.6-21.9-15.5 26.8-.4 7.9-25.6 8.7 25.4 26.8-.3-21.5 16 8.6 25.4-21.9-15.5zm45.3-147.6L370.6 212l19.2 18.7-26.5-3.8-11.8 24-4.6-26.4-26.6-3.8 23.8-12.5-4.6-26.5 19.2 18.7zm-78.2-73-2 26.7 24.9 10.1-26.1 6.4-1.9 26.8-14.1-22.8-26.1 6.4 17.3-20.5-14.2-22.7 24.9 10.1z"
			/>
		</g>
	</svg>
);

export const IconIndia = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 512 512"
		aria-label="India"
		role="img"
	>
		<mask id="a">
			<circle cx="256" cy="256" r="256" fill="#fff" />
		</mask>
		<g mask="url(#a)">
			<path fill="#eee" d="m0 160 256-32 256 32v192l-256 32L0 352z" />
			<path fill="#ff9811" d="M0 0h512v160H0Z" />
			<path fill="#6da544" d="M0 352h512v160H0Z" />
			<circle cx="256" cy="256" r="72" fill="#0052b4" />
			<circle cx="256" cy="256" r="48" fill="#eee" />
			<circle cx="256" cy="256" r="24" fill="#0052b4" />
		</g>
	</svg>
);
