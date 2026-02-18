import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App.tsx";
import "./styles/index.css";

registerSW({
  immediate: true,
  onRegisteredSW(_, registration) {
    registration?.addEventListener("updatefound", () => {
      console.log("PWA: update found, reload when ready");
    });
  },
});

createRoot(document.getElementById("root")!).render(<App />);
  