"use strict";

document.getElementById("app").addEventListener("load", () => {
  const app = document.getElementById("app").contentWindow;
  const results = document.getElementById("results");
  const text = id => app.document.getElementById(id).textContent;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const event = (alpha, beta, gamma) => ({
    type: "deviceorientationabsolute", absolute: true, alpha, beta, gamma
  });

  try {
    const compassTab = app.document.getElementById("compass-tab");
    const poleTab = app.document.getElementById("pole-tab");
    const compassPanel = app.document.getElementById("compass-panel");
    const polePanel = app.document.getElementById("pole-panel");
    assert(!compassPanel.hidden && polePanel.hidden && compassTab.getAttribute("aria-selected") === "true", "Compass tab initially selected");
    poleTab.click();
    assert(compassPanel.hidden && !polePanel.hidden && poleTab.getAttribute("aria-selected") === "true" &&
      poleTab.tabIndex === 0 && compassTab.tabIndex === -1, "Polar tab selected");
    poleTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    assert(!compassPanel.hidden && polePanel.hidden && compassTab.tabIndex === 0, "Arrow key wraps to compass tab");
    compassTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "End", bubbles: true }));
    assert(!polePanel.hidden && poleTab.tabIndex === 0, "End selects polar tab");
    poleTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    assert(!compassPanel.hidden && compassTab.tabIndex === 0, "Home selects compass tab");
    app.onOrientation(event(270, 0, 0));
    assert(text("bearing") === "90.0°", "Flat east bearing");
    app.onOrientation(event(270, 45, 50));
    assert(text("bearing") === "90.0°", "Tilted east bearing");
    app.onOrientation(event(270, 89, 0));
    assert(text("bearing") === "90.0°" && text("message-text").includes("nearly vertical"), "Near vertical warning and bearing");
    app.onOrientation(event(270, 90, 0));
    assert(text("bearing") === "90.0°" && text("message-text").includes("undefined"), "Vertical warning and bearing");
    app.onOrientation(event(270, 120, 0));
    assert(text("bearing") === "270.0°", "Top edge reversed past vertical");
    app.onOrientation(event(270, -120, 30));
    assert(text("bearing") === "270.0°", "Top edge reversed past negative vertical");
    app.onOrientation(event(270, null, null));
    assert(text("bearing") === "90.0°", "Heading available without tilt values");
    app.onOrientation({ type: "deviceorientation", webkitCompassHeading: 42, webkitCompassAccuracy: -1, beta: 70, gamma: 10 });
    assert(text("bearing") === "42.0°" && text("message-text").includes("accuracy is unavailable"), "WebKit heading with unavailable accuracy");
    app.onOrientation({ type: "deviceorientation", webkitCompassHeading: 42, webkitCompassAccuracy: 20, beta: 89, gamma: 10 });
    assert(text("bearing") === "42.0°" && text("message-text").includes("nearly vertical") && text("message-text").includes("±20°"), "Combined WebKit warnings");
    app.updateLocation({ coords: { latitude: -35, longitude: 149, altitude: null, accuracy: 10 } });
    app.onOrientation(event(180, 45, 0));
    const declination = app.calculateDeclination(-35, 149, 0, new Date());
    const expected = `${(Math.round((((180 + declination) % 360 + 360) % 360) * 10) % 3600 / 10).toFixed(1)}°`;
    assert(text("bearing") === expected && text("target") === "TARGET 180°", "Tilted true bearing and southern target");

    const select = app.document.getElementById("sensor-reference");
    const dot = app.document.getElementById("sight-dot");
    const poleCard = app.document.querySelector(".pole-card");
    select.value = "true";
    select.dispatchEvent(new app.Event("change"));
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: 10 } });
    app.onOrientation(event(0, 45, 50));
    poleTab.click();
    assert(text("pole-result") === "0.0° away" && text("phone-altitude") === "45.0°" &&
      text("pole-altitude") === "45.0°" && dot.style.left === "50%" && dot.style.top === "50%" &&
      poleCard.style.getPropertyValue("--aim-color") === "#caeaa1", "Northern pole centered with roll");
    compassTab.click();
    app.onOrientation(event(0, 35, 0));
    poleTab.click();
    assert(text("pole-result") === "10.0° away", "Readings update while polar tab is hidden");
    app.onOrientation(event(0, 35, 0));
    assert(text("pole-result") === "10.0° away" && parseFloat(dot.style.top) > 50, "Below pole moves dot down");
    app.onOrientation(event(0, 55, 0));
    assert(text("pole-result") === "10.0° away" && parseFloat(dot.style.top) < 50, "Above pole moves dot up");
    app.onOrientation(event(350, 45, 0));
    assert(parseFloat(dot.style.left) > 50 && text("pole-result") !== "0.0° away", "Clockwise of north moves dot right");
    app.onOrientation(event(10, 45, 0));
    assert(parseFloat(dot.style.left) < 50, "Counterclockwise across north moves dot left");
    app.onOrientation(event(0, 48, 0));
    assert(text("pole-result") === "3.0° away" && poleCard.style.getPropertyValue("--aim-color") === "#e5ca86", "Intermediate target color");
    app.onOrientation(event(180, 0, 0));
    assert(text("pole-status").includes("edge") && Math.abs(Math.hypot(parseFloat(dot.style.left) - 50, parseFloat(dot.style.top) - 50) - 44) < 0.001, "Far target clamped to edge");
    app.updateLocation({ coords: { latitude: -35, longitude: 149, altitude: null, accuracy: 10 } });
    app.onOrientation(event(180, 35, 0));
    assert(text("pole-result") === "0.0° away" && text("pole-altitude") === "35.0°", "Southern pole centered");
    app.onOrientation(event(0, 145, 0));
    assert(text("pole-result") === "0.0° away" && text("phone-altitude") === "35.0°", "Inverted top edge centered");
    app.onOrientation(event(180, null, null));
    assert(dot.hidden && text("pole-status").includes("altitude"), "Missing altitude hides target");
    app.locationError({ code: 1 });
    app.onOrientation(event(180, 35, 0));
    assert(dot.hidden && text("pole-status").includes("location"), "Missing location hides target");
    app.updateLocation({ coords: { latitude: 35, longitude: 149, altitude: null, accuracy: 10 } });
    select.value = "magnetic";
    app.eval("state.declination = null; render()");
    assert(dot.hidden && text("pole-status").includes("True north"), "Missing declination hides target");
    select.value = "true";
    app.eval("state.lastReading = 0; render()");
    assert(dot.hidden && text("phone-altitude") === "—", "Stale sensor reading hides target");
    results.textContent = "PASS: tabs, keyboard navigation, hidden live updates, compass orientation, both poles, projection and missing data";
  } catch (error) {
    results.textContent = `FAIL: ${error.message}`;
    throw error;
  }
});
