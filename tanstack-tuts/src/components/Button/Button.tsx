import { useCallback } from "react";
import "./button.scss";
import { Button as PrimeButton } from "primereact/button";

type PrimeButtonProps = React.ComponentProps<typeof PrimeButton>;

interface ButtonProps extends PrimeButtonProps {
  // You can override or extend here if needed
  label?: string;
  badge?: string;
  loading?: boolean;
  link?: boolean;
  outlined?: boolean;
  raised?: boolean;
  rounded?: boolean;
  children?: React.ReactNode;
}

function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  if (btn.hasAttribute("disabled")) return;

  const ripple = document.createElement("span");
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

const ButtonPT = {
  root: ({ props }: { props: ButtonProps }) => {
    const classes = ["btn", props.className].filter(Boolean);

    // Variant styles
    if (props.link) classes.push("btn-link");
    if (props.outlined) classes.push("btn-outlined");
    if (props.raised) classes.push("btn-raised");
    if (props.rounded) classes.push("btn-rounded");

    // Severity
    if (props.severity && !props.link && !props.outlined) {
      classes.push(`btn-${props.severity}`);
    }

    return {
      className: classes.join(" "),
      style: {
        position: "relative",
        overflow: "hidden",
        opacity: props.disabled || props.loading ? 0.65 : 1,
        cursor: props.disabled || props.loading ? "not-allowed" : "pointer",
      } as React.CSSProperties,
    };
  },

  label: {
    className: "btn-label",
    style: ({ props }: { props: ButtonProps }) => ({
      display: props.loading && !props.label ? "none" : "inline",
    }),
  },

  icon: { className: "btn-icon" },
  loadingIcon: { className: "btn-loading-icon pi pi-spinner pi-spin" },
  badge: { className: "btn-badge" },
};

const Button = (props: ButtonProps) => {
  const { onClick, ...rest } = props;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(e);
      onClick?.(e);
    },
    [onClick]
  );

  return (
    <PrimeButton
      pt={ButtonPT}
      {...rest}
      loadingIcon={<LoadingIcon width={24} height={24} />}
      onClick={handleClick}
    />
  );
};

export default Button;

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
