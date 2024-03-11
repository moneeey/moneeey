import ReactDatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import type { WithDataTestId } from "./Common";
import { BaseInputClzz, InputContainer, type InputProps } from "./Input";

type DatePickerProps = InputProps<Date> & WithDataTestId;

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
}: DatePickerProps) => {
	return InputContainer({
		prefix,
		suffix,
		isError,
		input: (
			<ReactDatePicker
				data-testid={testId}
				popperPlacement="auto"
				fixedHeight
				className={`${BaseInputClzz || ""} z-50 ${className || ""}`}
				selected={value}
				onChange={(newValue: Date) => newValue && onChange(newValue)}
				readOnly={readOnly}
				disabled={disabled}
			/>
		),
	});
};

export { DatePicker as default };
