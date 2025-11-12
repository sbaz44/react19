import "./header.scss";
import { Button as PrimeButton } from "primereact/button";

type ButtonProps = {
  message?: string;
};

const Button = ({ message = "shahbz" }: ButtonProps) => (
  <div className="header_container">
    <PrimeButton pt={ButtonPT} />
  </div>
);

export default Button;

const ButtonPT: any = {
  button: {
    root: ({ props }: { props: any }) => {
      console.log({ props });
      // Base class
      const classes = ["btn-adjust"];

      // Default: Primary
      classes.push("bg-primary", "text-white");

      // Link style
      if (props.link) {
        classes.push("link-style");
      }

      // Severity
      if (props.severity === "secondary") {
        classes.push("bg-secondary");
      } else if (props.severity === "danger") {
        classes.push("bg-danger");
      } else if (props.severity === "success") {
        classes.push("bg-success");
      }

      // Hover class (applied on hover via parent)
      const hoverClass = props.link
        ? ""
        : props.severity === "secondary"
          ? "hover-bg-secondary"
          : "hover-bg-primary";

      return {
        className: classes.join(" "),
        // Wrap hover in a span to target
        // We'll use a child element for hover background
        // Or use CSS-only solution above
      };
    },

    // Optional: Wrap label in span for hover targeting
    label: {
      className: "label123",
      style: { userSelect: "none" },
    },

    // Optional: Hover background via child
    // Not needed if using CSS parent selector
  },
};
