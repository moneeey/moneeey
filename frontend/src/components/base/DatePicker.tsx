import ReactDatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import { forwardRef } from "react";
import type { ReactNode } from "react-datepicker/node_modules/@types/react/index"; // incompatible with our project's
import type { WithDataTestId } from "./Common";
import { BaseInputClzz, InputContainer, type InputProps } from "./Input";

type DatePickerProps = { dateFormat: string } & InputProps<Date> &
	WithDataTestId;

type CustomDateInputProps = Partial<{
	className: string;
	value: string;
	disabled?: boolean;
	readOnly?: boolean;
	onChange: (value: string) => void;
	onClick: () => void;
}> &
	WithDataTestId;

const CustomDateInput = forwardRef<HTMLInputElement, CustomDateInputProps>(
	(
		{ className, value, onClick, onChange, testId, disabled, readOnly },
		ref,
	) => {
		return (
			<input
				ref={ref}
				data-testid={testId}
				className={className}
				type="text"
				value={value}
				onChange={(e) => onChange?.(e.target.value)}
				onClick={onClick}
				disabled={disabled}
				readOnly={readOnly}
			/>
		);
	},
);

const DatePicker = ({
	className,
	value,
	onChange,
	testId,
	disabled,
	readOnly,
	prefix,
	suffix,
	isError,
	containerArea,
	dateFormat,
}: DatePickerProps) => {
	const clazzName = `${BaseInputClzz || ""} z-50 ${className || ""}`;
	return InputContainer({
		prefix,
		suffix,
		isError,
		readOnly,
		testId,
		containerArea,
		input: (
			<ReactDatePicker
				withPortal
				fixedHeight
				className={clazzName}
				dateFormat={dateFormat}
				selected={value}
				onChange={(newValue: Date) => newValue && onChange(newValue)}
				readOnly={readOnly}
				disabled={disabled === true || readOnly === true}
				customInput={
					(
						<CustomDateInput
							testId={testId}
							disabled={disabled === true || readOnly === true}
							readOnly={readOnly}
						/>
					) as unknown as ReactNode
				}
			/>
		),
	});
};

export default DatePicker;
