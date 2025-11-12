import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./master.scss";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { PrimeReactProvider } from "primereact/api";
import "./assets/themes/mytheme/theme.scss";
import "primereact/resources/themes/lara-light-cyan/theme.css";

// Create a new router instance
const router = createRouter({ routeTree });

export const theme = {
  button: {
    root: {
      style: {
        padding: "0.5rem 1rem",
        borderRadius: "0.375rem",
        color: "white",
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s ease",
      },
      ":hover": {
        style: { backgroundColor: "var(--color-primary-hover)" },
      },
      className: "btn-adjust",
    },
    label: { style: { userSelect: "none" } },
  },

  inputtext: {
    root: {
      style: {
        width: "100%",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.375rem",
        border: "1px solid var(--color-input-border)",
        backgroundColor: "var(--color-input-bg)",
        color: "var(--color-text)",
        outline: "none",
      },
      ":focus": {
        style: {
          borderColor: "var(--color-primary)",
          boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)",
        },
      },
    },
  },

  card: {
    root: {
      style: {
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden",
      },
    },
    title: {
      style: {
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "var(--color-text)",
        marginBottom: "0.5rem",
      },
    },
    body: { style: { padding: "1.5rem" } },
  },

  panel: {
    root: {
      style: {
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "0.5rem",
        overflow: "hidden",
      },
    },
    header: {
      style: {
        padding: "0.75rem 1.25rem",
        backgroundColor: "var(--color-surface)",
        color: "var(--color-text)",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border)",
        cursor: "pointer",
      },
    },
    content: {
      style: { padding: "1.25rem", color: "var(--color-text)" },
    },
    toggler: { style: { color: "var(--color-muted)" } },
  },
};

// Register the router instance for type safety
// declare module '@tanstack/react-router' {
//   interface Register {
//     router: typeof router
//   }
// }

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <PrimeReactProvider value={{ unstyled: true, pt: theme }}>
        <RouterProvider router={router} />
      </PrimeReactProvider>
    </StrictMode>
  );
}

// themes.ts
