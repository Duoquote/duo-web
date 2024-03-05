import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import Pages from "./pages";

import { Provider } from "react-redux";
import store from "./redux/store";

import i18n from "i18next";
import { useTranslation, initReactI18next } from "react-i18next";
import detector from "i18next-browser-languagedetector";

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import "leaflet/dist/leaflet.css";

import * as langs from "./langs";

const resources = Object.entries(langs).reduce((acc, [key, value]) => {
  acc[key] = { translation: value };
  return acc;
}, {});

i18n
  .use(detector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "tr",
    keySeparator: ".",
    debug: true,
    interpolation: {
      escapeValue: false
    }
  });

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Pages.Main />,
      },
      {
        path: "/about",
        element: <Pages.About />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
);
