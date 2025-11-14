// components/MultiSelect.tsx
import React from "react";
import { MultiSelect as PrimeMultiSelect } from "primereact/multiselect";
import { FloatLabel } from "primereact/floatlabel";
import "./MultiSelect.scss";

type PrimeMultiSelectProps = React.ComponentProps<typeof PrimeMultiSelect>;

interface MultiSelectProps extends PrimeMultiSelectProps {
  label?: string;
  floatLabel?: boolean;
}

const MultiSelectPT = {
  root: ({ props }: { props: MultiSelectProps }) => {
    const classes = ["ms-root", props.className].filter(Boolean);
    if (props.disabled) classes.push("ms-disabled");
    if (props.invalid) classes.push("ms-invalid");

    return {
      className: classes.join(" "),
      style: {
        position: "relative",
        overflow: "hidden",
      } as React.CSSProperties,
    };
  },
  labelContainer: { className: "ms-label-container" },
  label: { className: "ms-label" },
  input: { className: "ms-input" },
  dropdownIcon: { className: "ms-icon" },
  loadingIcon: { className: "ms-loading-icon pi pi-spinner pi-spin" },
  clearIcon: { className: "ms-clear-icon" },
  icon: { className: "ms-icon-container" },
  chip: { className: "ms-chip" },
  chipLabel: { className: "ms-chip-label" },
  removeTokenIcon: { className: "ms-chip-remove" },
  panel: {
    className: "ms-panel",
    // Clear filter when panel closes
  },
  list: {
    className: "ms-list-items",
  },
  // filterInput: ({ props }: { props: any }) => {
  //   return {
  //     className: "ms-filter-input",
  //     style: {
  //       paddingRight: props.showFilterClear ? "4rem" : undefined,
  //     },
  //   };
  // },
  checkbox: { root: { className: "ms-checkbox" } },
  item: ({ context }: any) => ({
    className: [
      "ms-item",
      context?.focused && "ms-item-focused",
      context?.selected && "ms-item-selected",
      context?.selected && "ms-item-checkmark",
    ]
      .filter((item) => item)
      .join(" "),
  }),
  header: { className: "ms-header" },
  closeButton: { className: "ms-close-btn" },
  filterInput: {
    className: "ms-filter-input",
    style: { backgroundColor: "green" },
  },
  emptyMessage: { className: "ms-empty" },
};

const MultiSelect = React.forwardRef<any, MultiSelectProps>(
  (
    {
      label,
      floatLabel = false,
      value,
      onChange,
      options,
      optionLabel,
      optionValue,
      placeholder = "Select items",
      filter = true,
      showClear = true,
      display = "comma",
      className,
      ...rest
    },
    ref
  ) => {
    const ms = (
      <PrimeMultiSelect
        ref={ref}
        value={value}
        onChange={onChange}
        options={options}
        optionLabel={optionLabel}
        optionValue={optionValue}
        placeholder={placeholder}
        filter={filter}
        showClear={showClear}
        display={display}
        pt={MultiSelectPT}
        className={className}
        resetFilterOnHide={true}
        {...rest}
      />
    );

    if (floatLabel && label) {
      return (
        <FloatLabel>
          {ms}
          <label>{label}</label>
        </FloatLabel>
      );
    }

    return ms;
  }
);

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
