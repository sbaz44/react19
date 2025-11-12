import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "primereact/resources/themes/lara-light-cyan/theme.css";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { PrimeReactProvider } from "primereact/api";
import "./assets/themes/mytheme/theme.scss";

// Create a new router instance
const router = createRouter({ routeTree });

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
      <PrimeReactProvider value={{ unstyled: false }}>
        <RouterProvider router={router} />
      </PrimeReactProvider>
    </StrictMode>
  );
}

// themes.ts
