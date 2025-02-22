import type { ReactNode } from "react";
import ReactSelect from "react-select";
import CreatableReactSelect from "react-select/creatable";

import type { WithDataTestId } from "./Common";
import { InputContainer, type InputProps } from "./Input";

import "./Select.css";

type Option = {
	label: string | ReactNode;
	value: string;
};

type BaseSelectProps = {
	options: Option[];
	onCreate?: (name: string) => void;
	onSearch?: (search: string) => void;
	createLabel?: string;
	clearable?: boolean;
};

type SelectProps = InputProps<string> & WithDataTestId & BaseSelectProps;

const Select = ({
	className,
	value,
	options,
	onChange,
	placeholder,
	testId,
	disabled,
	readOnly,
	prefix,
	suffix,
	containerArea,
	isError,
	onCreate,
	onSearch,
	createLabel,
	clearable,
}: SelectProps) => {
	const SelectComponent =
		onCreate || onSearch ? CreatableReactSelect : ReactSelect;

	return InputContainer({
		prefix,
		suffix,
		isError,
		readOnly,
		testId,
		containerArea,
		input: (
			<div data-testid={testId}>
				<SelectComponent
					className={`mn-select ${className || ""}`}
					classNamePrefix={"mn-select"}
					unstyled={true}
					menuPlacement="auto"
					menuPortalTarget={document.body}
					isMulti={false}
					options={options}
					value={options.find((opt) => opt.value === value)}
					onChange={(newValue) => onChange(newValue?.value ?? "")}
					onCreateOption={(name) => (onCreate ?? onSearch)?.(name)}
					formatCreateLabel={(value: string) =>
						`${createLabel || "Create"} ${value}`
					}
					placeholder={placeholder}
					isDisabled={disabled === true || readOnly === true}
					isClearable={clearable}
				/>
			</div>
		),
	});
};

type MultiSelectProps = InputProps<string[]> & WithDataTestId & BaseSelectProps;
const MultiSelect = ({
	className,
	value,
	options,
	onChange,
	placeholder,
	testId,
	disabled,
	readOnly,
	prefix,
	suffix,
	containerArea,
	isError,
	onCreate,
	onSearch,
	createLabel,
	clearable,
}: MultiSelectProps) => {
	const SelectComponent =
		onCreate || onSearch ? CreatableReactSelect : ReactSelect;

	return InputContainer({
		prefix,
		suffix,
		isError,
		readOnly,
		testId,
		containerArea,
		input: (
			<div data-testid={testId}>
				<SelectComponent
					className={`mn-select ${className || ""}`}
					data-testid={testId}
					classNamePrefix={"mn-select"}
					unstyled={true}
					menuPlacement="auto"
					menuPortalTarget={document.body}
					isMulti={true}
					options={options}
					value={(value || []).map((val) =>
						options.find((opt) => opt.value === val),
					)}
					onChange={(newValue) =>
						onChange(
							newValue
								.map((option) => option?.value || "")
								.filter((val) => val !== ""),
						)
					}
					onCreateOption={(name) => (onCreate ?? onSearch)?.(name)}
					formatCreateLabel={(value: string) =>
						`${createLabel || "Create"} ${value}`
					}
					placeholder={placeholder}
					isDisabled={disabled === true || readOnly === true}
					isClearable={clearable}
				/>
			</div>
		),
	});
};

export { Select as default, MultiSelect };
