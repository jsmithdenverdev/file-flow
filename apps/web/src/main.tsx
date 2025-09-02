import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ServiceProvider } from "@/context/ServiceContext";
import { createServices } from "@/composition-root";
import { createAppConfig, parseEnvironment } from "@/config";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ServiceProvider
      services={createServices({ config: createAppConfig(parseEnvironment()) })}
    >
      <App />
    </ServiceProvider>
  </StrictMode>
);
