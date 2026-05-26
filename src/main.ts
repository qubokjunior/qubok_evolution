import "./styles.css";
import { mountQubokEvolveApp } from "./ui/App";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

void mountQubokEvolveApp(root);
