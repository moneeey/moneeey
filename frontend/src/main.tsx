// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./main.css";

ReactDOM.createRoot(document.querySelector(".App") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
