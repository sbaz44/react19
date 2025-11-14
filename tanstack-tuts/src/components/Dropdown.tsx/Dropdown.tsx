// components/Dropdown.tsx
import React, { useCallback } from "react";
import { Dropdown as PrimeDropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import "./dropdown.scss";
import { LoadingIcon } from "../Button/Button";

type PrimeDropdownProps = React.ComponentProps<typeof PrimeDropdown>;

interface DropdownProps extends PrimeDropdownProps {
  label?: string;
  floatLabel?: boolean; // Wrap in FloatLabel
  className?: string;
}

const DropdownPT = {
  root: ({ props }: { props: DropdownProps }) => {
    const classes = ["dropdown-root", props.className].filter(Boolean);

    if (props.disabled) classes.push("dropdown-disabled");
    if (props.invalid) classes.push("dropdown-invalid");
    if (props.variant === "filled") classes.push("dropdown-filled");
    if (props.loading) classes.push("dropdown-loading");

    return {
      className: classes.join(" "),
      style: {
        position: "relative",
        overflow: "hidden",
      } as React.CSSProperties,
      //   onClick: createRipple,
    };
  },

  input: {
    className: "dropdown-input",
  },

  label: {
    className: "dropdown-label",
  },

  dropdownIcon: {
    className: "dropdown-icon",
  },

  loadingIcon: {
    className: "dropdown-loading-icon",
  },

  clearIcon: {
    className: "dropdown-clear-icon",
  },

  filterClearIcon: {
    className: "filter-clear-icon",
  },

  panel: {
    className: "dropdown-panel",
  },
  wrapper: {
    className: "dropdown-panel-wrapper",
  },

  list: {
    className: "dropdown-panel-items",
  },
  select: {
    className: "selected",
  },
  header: {
    className: "dropdown-header",
  },

  filterInput: ({ props }: { props: DropdownProps }) => {
    return {
      className: "dropdown-filter-input",
      style: {
        paddingRight: props.showFilterClear ? "4rem" : undefined,
      },
    };
  },
  //     {
  //     className: "dropdown-filter-input",
  //   },

  item: ({ props, state, context }: any) => {
    // console.log({ props, state, context });
    return {
      className: [
        "dropdown-item",
        context?.selected && "dropdown-item-selected", // ← THIS is the correct one!
        context?.focused && "dropdown-item-focused", // ← keyboard focus
        props.checkmark && context?.selected && "dropdown-item-checkmark",
      ]
        .filter(Boolean)
        .join(" "),
    };
  },

  emptyMessage: {
    className: "dropdown-empty-message",
  },
};

const Dropdown = React.forwardRef<any, DropdownProps>(
  (
    {
      label,
      floatLabel = false,
      placeholder,
      value,
      onChange,
      options,
      optionLabel,
      optionValue,
      itemTemplate,
      valueTemplate,
      filter = false,
      showClear = false,
      loading = false,
      editable = false,
      checkmark = false,
      className,
      ...rest
    },
    ref
  ) => {
    const dropdown = (
      <PrimeDropdown
        ref={ref}
        value={value}
        onChange={onChange}
        options={options}
        optionLabel={optionLabel}
        optionValue={optionValue}
        itemTemplate={itemTemplate}
        valueTemplate={valueTemplate}
        placeholder={placeholder || "Select..."}
        filter={filter}
        showClear={showClear}
        loading={loading}
        editable={editable}
        checkmark={checkmark}
        pt={DropdownPT}
        className={className}
        resetFilterOnHide={true}
        loadingIcon={<LoadingIcon width={24} height={24} />}
        {...rest}
      />
    );

    if (floatLabel && label) {
      return (
        <FloatLabel>
          {dropdown}
          <label>{label}</label>
        </FloatLabel>
      );
    }

    return dropdown;
  }
);

Dropdown.displayName = "Dropdown";

export default Dropdown;
