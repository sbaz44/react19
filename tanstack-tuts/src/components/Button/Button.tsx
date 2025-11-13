import { useCallback } from "react";
import "./button.scss";
import { Button as PrimeButton } from "primereact/button";

type PrimeButtonNativeProps = React.ComponentProps<typeof PrimeButton>;
type CustomButtonProps = {
  label?: string;
  badge?: string | undefined;
  className?: string | undefined;
  loading?: boolean | undefined;
  link?: boolean | undefined;
  outlined?: boolean | undefined;
  icon?: any;
  rounded?: boolean | undefined;
  raised?: boolean | undefined;
  children?: React.ReactNode | undefined;
};

type ButtonProps = CustomButtonProps & PrimeButtonNativeProps;

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;

  if (button.disabled) return;

  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;

  const rect = button.getBoundingClientRect();
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  const existingRipple = button.querySelector(".ripple");
  if (existingRipple) {
    existingRipple.remove();
  }
  button.appendChild(circle);
  setTimeout(() => {
    circle.remove();
  }, 600);
}

const Button = (props: ButtonProps) => {
  const { onClick, ...restProps } = props;
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(event);
      if (onClick) {
        onClick(event as any);
      }
    },
    [onClick]
  );
  console.log(restProps);
  return <PrimeButton pt={ButtonPT} {...restProps} onClick={handleClick} />;
};

export default Button;

const ButtonPT: any = {
  // button: {
  root: ({ props }: { props: any }) => {
    console.log({ props });
    const classes = ["btn"];
    props.className && classes.push(props.className);
    // Link style
    if (props.link) {
      classes.push("btn-link-style");
    }

    // Severity
    if (props.severity === "secondary") {
      classes.push("bg-secondary");
    } else if (props.severity === "danger") {
      classes.push("bg-danger");
    } else if (props.severity === "success") {
      classes.push("bg-success");
    }
    return {
      className: classes.join(" "),
      style: {
        opacity: props.disabled || props.loading ? 0.7 : 1,
        cursor: props.disabled || props.loading ? "not-allowed" : "pointer",
        borderRadius: props.rounded ? "1000px" : null,
        boxShadow: props.raised
          ? "0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)"
          : null,
        backgroundColor: props.raised || props.outlined ? "transparent" : null,
        borderColor: props.raised ? "transparent" : null,
      },
    };
  },

  // Optional: Wrap label in span for hover targeting
  label: ({ props }: { props: any }) => {
    return {
      style: {
        display: !props.label || props.loading ? "none" : null,
      },
      className: "btn-label",
    };
  },
  icon: {
    className: "icon123",
  },
  loadingIcon: {
    className: "btn-loading-icon",
  },
  badge: {
    className: "btn-badge",
  },
  // Optional: Hover background via child
  // Not needed if using CSS parent selector
  // },
};

export const LoadingIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" {...props}>
    <radialGradient
      id="a"
      cx={0.66}
      fx={0.66}
      cy={0.313}
      fy={0.313}
      gradientTransform="scale(1.5)"
    >
      <stop offset={0} stopColor="#ff156d" />
      <stop offset={0.3} stopColor="#ff156d" stopOpacity={0.9} />
      <stop offset={0.6} stopColor="#ff156d" stopOpacity={0.6} />
      <stop offset={0.8} stopColor="#ff156d" stopOpacity={0.3} />
      <stop offset={1} stopColor="#ff156d" stopOpacity={0} />
    </radialGradient>
    <circle
      transform-origin="center"
      fill="none"
      stroke="url(#a)"
      strokeWidth={15}
      strokeLinecap="round"
      strokeDasharray="200 1000"
      cx={100}
      cy={100}
      r={70}
    >
      <animateTransform
        type="rotate"
        attributeName="transform"
        calcMode="spline"
        dur={2}
        values="360;0"
        keyTimes="0;1"
        keySplines="0 0 1 1"
        repeatCount="indefinite"
      />
    </circle>
    <circle
      transform-origin="center"
      fill="none"
      opacity={0.2}
      stroke="#ff156d"
      strokeWidth={15}
      strokeLinecap="round"
      cx={100}
      cy={100}
      r={70}
    />
  </svg>
);
