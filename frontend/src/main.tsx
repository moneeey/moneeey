// @ts-nocheck
import "./main.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

ReactDOM.createRoot(document.querySelector(".App") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
