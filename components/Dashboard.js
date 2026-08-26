"use client";

import { useEffect, useState } from "react";
import TopBar from "./TopBar";
import CaptureBar from "./CaptureBar";
import Home from "./screens/Home";
import Crm from "./screens/Crm";
import Finance from "./screens/Finance";
import Review from "./screens/Review";

export default function Dashboard() {
  const [active, setActive] = useState("home");
  const [openTaskId, setOpenTaskId] = useState(null);

  useEffect(() => {
    function onApriSchermata(e) {
      setActive(e.detail);
      if (window.location.hash.startsWith("#crm/")) {
        setOpenTaskId(window.location.hash.replace("#crm/", ""));
      }
    }
    window.addEventListener("personalos:apri-schermata", onApriSchermata);
    return () => window.removeEventListener("personalos:apri-schermata", onApriSchermata);
  }, []);

  function selectScreen(id) {
    setActive(id);
    if (id !== "crm") setOpenTaskId(null);
  }

  return (
    <div id="app">
      <TopBar active={active} onSelect={selectScreen} />
      <main id="grid-container">
        {active === "home" && <Home />}
        {active === "crm" && <Crm openTaskId={openTaskId} onTaskOpened={() => setOpenTaskId(null)} />}
        {active === "finance" && <Finance />}
        {active === "review" && <Review />}
      </main>
      <CaptureBar />
    </div>
  );
}
