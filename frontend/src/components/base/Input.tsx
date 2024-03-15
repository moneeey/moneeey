import { type ReactNode, useEffect, useState } from "react";
import { NumericFormat } from "react-number-format";

import type { ClassNameType } from "../../utils/Utils";

import type { WithDataTestId } from "./Common";

export const BaseInputClzz: ClassNameType = "w-full color-white bg-transparent";

export type InputProps<T> = WithDataTestId & {
	className?: string;
	onChange: (value: T) => void;
	value: T;
	placeholder: string;
	prefix?: string | ReactNode;
	suffix?: string | ReactNode;
	disabled?: boolean;
	readOnly?: boolean;
	isError?: boolean;
};

type AddonType = string | ReactNode | undefined;
type InputContainerProps = {
	prefix: AddonType;
	suffix: AddonType;
	isError: boolean | undefined;
	input: ReactNode;
	baseClassname?: string;
};

export const InputContainer = ({
	baseClassname,
	prefix,
	suffix,
	isError,
	input,
}: InputContainerProps) => {
	return (
		<div
			className={`${baseClassname || BaseInputClzz} flex ${
				isError ? "border border-red-400" : ""
			}`}
		>
			{prefix}
			<div className="grow">{input}</div>
			{suffix}
		</div>
	);
};

const Input = ({
	className,
	value,
	onChange,
	placeholder,
	testId,
	disabled,
	readOnly,
	prefix,
	suffix,
	isError,
}: InputProps<string>) => {
	const [currentValue, setCurrentValue] = useState<string>(value);

	useEffect(() => {
		return () => {
			if (currentValue !== value) {
				onChange(currentValue);
			}
		};
	}, [currentValue, onChange, value]);

	return InputContainer({
		prefix,
		suffix,
		isError,
		input: (
			<input
				data-testid={testId}
				type="text"
				className={`${BaseInputClzz} ${className || ""}`}
				value={currentValue}
				onChange={({ target: { value: newValue } }) =>
					setCurrentValue(newValue)
				}
				onBlur={() => currentValue !== value && onChange(currentValue)}
				placeholder={placeholder}
				disabled={disabled}
				readOnly={readOnly}
			/>
		),
	});
};

export type InputNumberProps = InputProps<number> & {
	thousandSeparator: string;
	decimalSeparator: string;
	decimalScale: number;
};

const InputNumber = ({
	className,
	value,
	onChange,
	placeholder,
	testId,
	prefix,
	suffix,
	disabled,
	readOnly,
	isError,
	thousandSeparator,
	decimalSeparator,
	decimalScale,
}: InputNumberProps) => {
	const [currentFloatValue, setCurrentFloatValue] = useState<number>(value);

	useEffect(() => {
		setCurrentFloatValue(value);
	}, [value]);

	return InputContainer({
		prefix,
		suffix,
		isError,
		input: (
			<NumericFormat
				data-testid={testId}
				className={`${BaseInputClzz} font-mono ${className || ""}`}
				value={currentFloatValue}
				onValueChange={({ floatValue, formattedValue }) => {
					if (floatValue && floatValue !== value) {
						setCurrentFloatValue(floatValue);
					}
				}}
				onBlur={() =>
					currentFloatValue &&
					currentFloatValue !== value &&
					onChange(currentFloatValue)
				}
				placeholder={placeholder}
				thousandsGroupStyle="thousand"
				thousandSeparator={thousandSeparator}
				decimalSeparator={decimalSeparator}
				decimalScale={decimalScale}
				disabled={disabled}
				readOnly={readOnly}
			/>
		),
	});
};

const TextArea = ({
	className,
	value,
	onChange,
	placeholder,
	testId,
	prefix,
	suffix,
	disabled,
	readOnly,
	isError,
	rows,
}: InputProps<string> & { rows?: number }) =>
	InputContainer({
		prefix,
		suffix,
		isError,
		input: (
			<textarea
				data-testid={testId}
				className={`${BaseInputClzz} ${className || ""}`}
				value={value}
				onBlur={({ target: { value: newValue } }) =>
					newValue !== value && onChange(newValue)
				}
				placeholder={placeholder}
				disabled={disabled}
				readOnly={readOnly}
				rows={rows}
			/>
		),
	});

type CheckboxProps = InputProps<boolean> & {
	children: string | ReactNode;
};

const Checkbox = ({
	className,
	value,
	onChange,
	placeholder,
	testId,
	children,
	prefix,
	suffix,
	disabled,
	readOnly,
	isError,
}: CheckboxProps) =>
	InputContainer({
		prefix,
		baseClassname: "color-white bg-transparent",
		suffix,
		isError,
		input: (
			<label>
				<input
					data-testid={testId}
					type="checkbox"
					className={`${className || ""} mr-2`}
					checked={value}
					onChange={({ target: { checked: newValue } }) => onChange(newValue)}
					placeholder={placeholder}
					disabled={disabled}
					readOnly={readOnly}
				/>
				{children}
			</label>
		),
	});

export { Input, InputNumber, TextArea, Checkbox };
