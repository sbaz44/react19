import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes.jsx";
import { enableReactTracking } from "@legendapp/state/config/enableReactTracking";
import { SocketDataProvider } from "./context/SocketContext.jsx";
import { enableReactComponents } from "@legendapp/state/config/enableReactComponents";
import { GoogleOAuthProvider } from "@react-oauth/google";
enableReactComponents();
enableReactTracking({
  auto: true,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        {/* <SocketDataProvider> */}
        <AppRoutes />
      </GoogleOAuthProvider>
      {/* </SocketDataProvider> */}
    </BrowserRouter>
  </StrictMode>
);
