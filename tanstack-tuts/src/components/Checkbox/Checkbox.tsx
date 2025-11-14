// components/Checkbox.tsx
import React from "react";
import { Checkbox as PrimeCheckbox } from "primereact/checkbox";
import "./checkbox.scss";

type PrimeCheckboxProps = React.ComponentProps<typeof PrimeCheckbox>;

interface CheckboxProps extends PrimeCheckboxProps {
  label?: string; // Optional inline label
  inputId?: string; // Required if using external <label>
}

const CheckboxPT = {
  root: ({ props }: { props: CheckboxProps }) => {
    const classes = ["cb-root", props.className].filter(Boolean);
    // console.log({ props });
    if (props.disabled) classes.push("cb-disabled");
    if (props.invalid) classes.push("cb-invalid");
    if (props.variant === "filled") classes.push("cb-filled");

    return {
      className: classes.join(" "),
      style: {
        position: "relative",
        // overflow: "hidden",
      } as React.CSSProperties,
    };
  },

  box: ({ props, state }: any) => ({
    className: [
      "cb-box",
      state.checked && "cb-checked",
      props.disabled && "cb-box-disabled",
    ].join(" "),
  }),

  input: { className: "cb-input" },
  icon: { className: "cb-icon" },
  label: { className: "cb-label" },
};

const Checkbox = React.forwardRef<any, CheckboxProps>(
  (
    {
      inputId,
      label,
      checked,
      onChange,
      disabled = false,
      invalid = false,
      variant,
      className,
      ...rest
    },
    ref
  ) => {
    const id = inputId || `cb-${Math.random().toString(36).substr(2, 9)}`;
    console.log(rest, checked);
    return (
      <div
        // className="cb-wrapper"
        className={`cb-wrapper ${disabled ? "cb-wrapper-disabled" : ""}`}
        // style={{
        //   cursor: disabled ? "not-allowed" : undefined,
        // }}
      >
        <PrimeCheckbox
          ref={ref}
          inputId={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          invalid={invalid}
          variant={variant}
          pt={CheckboxPT}
          className={className}
          {...rest}
        />
        {label && (
          <label htmlFor={id} className="cb-external-label">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
