import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/themes.css";
import "./styles/scrollbar.css";
import App from "./App.tsx";
import store from "./redux/store.ts";
import ToasterContainer from "./components/Reusable/Toaster.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { Provider } from "react-redux";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <ToasterContainer />
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
