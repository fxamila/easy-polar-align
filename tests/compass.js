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
    results.textContent = "PASS: flat, tilted, vertical, inverted, missing tilt, WebKit and true-north cases";
  } catch (error) {
    results.textContent = `FAIL: ${error.message}`;
    throw error;
  }
});
