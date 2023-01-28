import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import Pages from "./pages";

import { Provider } from "react-redux";
import store from "./redux/store";

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "./assets/css/fonts.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/about",
        element: <Pages.About />,
      }
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
