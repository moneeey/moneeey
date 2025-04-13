import { useEffect, useState } from "react";
import { formatDateFmt, parseDateFmt } from "../../utils/Date";
import type { WithDataTestId } from "./Common";
import { BaseInputClzz, InputContainer, type InputProps } from "./Input";

type DatePickerProps = { dateFormat: string } & InputProps<Date> &
	WithDataTestId;

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
	const [currentValue, setCurrentValue] = useState(
		formatDateFmt(value, dateFormat),
	);

	useEffect(
		() => setCurrentValue(formatDateFmt(value, dateFormat)),
		[value, dateFormat],
	);

	return InputContainer({
		prefix,
		suffix,
		isError:
			isError || Number.isNaN(parseDateFmt(currentValue, dateFormat).getTime()),
		readOnly,
		testId,
		containerArea,
		input: (
			<input
				data-testid={testId}
				className={`${BaseInputClzz} z-50 ${className || ""}`}
				type="text"
				placeholder={dateFormat}
				value={currentValue}
				onChange={({ target: { value: newValue } }) =>
					setCurrentValue(newValue)
				}
				onBlur={() => {
					if (!onChange || currentValue === formatDateFmt(value, dateFormat))
						return;
					try {
						const parsed = parseDateFmt(currentValue, dateFormat);
						if (!Number.isNaN(parsed.getTime())) {
							onChange(parsed);
						}
					} catch (e) {}
				}}
				disabled={disabled}
				readOnly={readOnly}
			/>
		),
	});
};

export default DatePicker;
