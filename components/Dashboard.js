"use client";

import { useState } from "react";
import TopBar from "./TopBar";
import CaptureBar from "./CaptureBar";
import Home from "./screens/Home";
import Crm from "./screens/Crm";
import Finance from "./screens/Finance";
import Review from "./screens/Review";

const SCREENS = { home: Home, crm: Crm, finance: Finance, review: Review };

export default function Dashboard() {
  const [active, setActive] = useState("home");
  const ActiveScreen = SCREENS[active];

  return (
    <div id="app">
      <TopBar active={active} onSelect={setActive} />
      <main id="grid-container">
        <ActiveScreen />
      </main>
      <CaptureBar />
    </div>
  );
}
