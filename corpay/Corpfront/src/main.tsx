import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log('PWA Service Worker Registered');
  },
});

/* Wrapper constrains dashboard to 16:9 for LG 55TR3DK (3840×2160); fits exactly on panel, letterboxes on other screens */
const isTvPreview = typeof window !== "undefined" && /[?&](?:tv=1|preview=lg)/i.test(window.location.search);

createRoot(document.getElementById("root")!).render(
  <div className={`corpfront-16-9${isTvPreview ? " corpfront-tv-preview" : ""}`}>
    <App />
  </div>
);
  