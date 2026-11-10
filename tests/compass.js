"use strict";

document.getElementById("app").addEventListener("load", async () => {
  const app = document.getElementById("app").contentWindow;
  const results = document.getElementById("results");
  const text = id => app.document.getElementById(id).textContent;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const event = (alpha, beta, gamma) => ({
    type: "deviceorientationabsolute", absolute: true, alpha, beta, gamma
  });
  const savedCalibration = app.localStorage.getItem("northstar-surface-calibration");
  const originalPermission = Object.getOwnPropertyDescriptor(app.DeviceOrientationEvent, "requestPermission");
  const originalSetInterval = app.setInterval;
  const originalGeolocation = Object.getOwnPropertyDescriptor(app.navigator, "geolocation");
  const originalHidden = Object.getOwnPropertyDescriptor(app.document, "hidden");

  try {
    const metadata = app.document.head;
    const canonical = metadata.querySelector('link[rel="canonical"]').href;
    const structuredData = JSON.parse(metadata.querySelector('script[type="application/ld+json"]').textContent);
    assert(structuredData["@type"] === "WebApplication" && structuredData.name === "Easy Polar Align" &&
      canonical === "https://fxamila.github.io/easy-polar-align/" && structuredData.url === canonical &&
      metadata.querySelector('meta[property="og:url"]').content === canonical,
      "Search metadata uses the canonical application URL");
    assert(metadata.querySelector('meta[name="description"]').content &&
      metadata.querySelector('meta[name="twitter:description"]').content, "Search and social descriptions are present");
    assert(app.document.title.toLowerCase().includes("online rough polar alignment") &&
      metadata.querySelector('meta[name="description"]').content.toLowerCase().includes("online polar alignment") &&
      app.document.querySelector("h1").textContent.toLowerCase().includes("online polar alignment"),
      "Title, description, and heading describe online polar alignment");
    assert(app.document.querySelector("footer").textContent.includes("v1.0.18") &&
      app.document.querySelector("footer a").href === "https://github.com/fxamila/easy-polar-align",
      "Footer shows version and GitHub link");
    app.document.getElementById("reset-calibration").click();
    const compassTab = app.document.getElementById("compass-tab");
    const poleTab = app.document.getElementById("pole-tab");
    const compassPanel = app.document.getElementById("compass-panel");
    const polePanel = app.document.getElementById("pole-panel");
    assert(!app.document.getElementById("start").hidden && text("message-text").includes("Start compass"), "Start button visible on load");
    assert(app.document.querySelector('[role="tab"]') === compassTab &&
      !compassPanel.hidden && polePanel.hidden && compassTab.getAttribute("aria-selected") === "true" &&
      compassTab.tabIndex === 0 && poleTab.tabIndex === -1, "Compass tab initially selected and first");
    poleTab.click();
    assert(compassPanel.hidden && !polePanel.hidden && poleTab.getAttribute("aria-selected") === "true" &&
      poleTab.tabIndex === 0 && compassTab.tabIndex === -1, "Polar tab selected");
    poleTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    assert(!compassPanel.hidden && compassTab.tabIndex === 0, "Home selects compass tab");
    compassTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "End", bubbles: true }));
    assert(!polePanel.hidden && poleTab.tabIndex === 0, "End selects polar tab");
    poleTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    assert(!compassPanel.hidden && polePanel.hidden && compassTab.tabIndex === 0, "Arrow key wraps to compass tab");
    const pointer = (target, type, x, y, options = {}) => target.dispatchEvent(new app.PointerEvent(type, {
      bubbles: true, pointerType: "touch", isPrimary: true, pointerId: 1, clientX: x, clientY: y, ...options
    }));
    pointer(compassPanel, "pointerdown", 180, 100);
    pointer(app, "pointerup", 70, 105);
    assert(!polePanel.hidden, "Swipe left opens polar tab");
    pointer(polePanel, "pointerdown", 50, 100);
    pointer(app, "pointerup", 160, 105);
    assert(!compassPanel.hidden, "Swipe right opens compass tab");
    pointer(compassPanel, "pointerdown", 100, 100);
    pointer(app, "pointerup", 170, 250);
    assert(!compassPanel.hidden, "Vertical scroll does not change tabs");
    pointer(compassPanel, "pointerdown", 100, 100);
    pointer(app, "pointercancel", 100, 100);
    pointer(app, "pointerup", 200, 100);
    assert(!compassPanel.hidden, "Cancelled swipe does not change tabs");
    poleTab.click();
    pointer(app.document.getElementById("calibrate"), "pointerdown", 180, 100);
    pointer(app, "pointerup", 70, 100);
    assert(!polePanel.hidden, "Controls do not start a swipe");
    pointer(polePanel, "pointerdown", 180, 100);
    pointer(polePanel, "pointerdown", 170, 100, { pointerId: 2, isPrimary: false });
    pointer(app, "pointerup", 70, 100);
    assert(!polePanel.hidden, "Pinch does not change tabs");
    const north = app.document.getElementById("north-marker");
    app.clearLocation();
    app.onOrientation(event(270, 0, 0));
    assert(text("bearing") === "90.0°", "Flat east bearing");
    assert(!north.hidden && north.style.transform === "rotate(-90deg)" &&
      text("north-legend").includes("MAGNETIC NORTH"), "East heading places magnetic north on left");
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
    assert(text("bearing") === "42.0°", "WebKit heading with unavailable accuracy");
    app.onOrientation({ type: "deviceorientation", webkitCompassHeading: 42, webkitCompassAccuracy: 20, beta: 89, gamma: 10 });
    assert(text("bearing") === "42.0°" && text("message-text").includes("nearly vertical"), "WebKit vertical warning");
    app.updateLocation({ coords: { latitude: -35, longitude: 149, altitude: null, accuracy: 10 } });
    app.onOrientation(event(180, 45, 0));
    const declination = app.calculateDeclination(-35, 149, 0, new Date());
    const expected = `${(Math.round((((180 + declination) % 360 + 360) % 360) * 10) % 3600 / 10).toFixed(1)}°`;
    assert(text("bearing") === expected && text("target") === "TARGET 180°", "Tilted true bearing and southern target");

    const dot = app.document.getElementById("sight-dot");
    const poleCard = app.document.querySelector(".pole-card");
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: 10 } });
    const trueEvent = (alpha, beta, gamma) => event(alpha + app.eval("state.declination"), beta, gamma);
    app.onOrientation(trueEvent(0, 45, 50));
    assert(Math.abs(parseFloat(north.style.transform.slice(7))) < 0.0001 &&
      text("north-legend").includes("TRUE NORTH"), "True north marker uses declination");
    app.onOrientation(trueEvent(270, 45, 0));
    assert(Math.abs(parseFloat(north.style.transform.slice(7)) + 90) < 0.0001, "True north at left for east heading");
    app.onOrientation(trueEvent(90, 45, 0));
    assert(Math.abs(parseFloat(north.style.transform.slice(7)) + 270) < 0.0001, "True north at right for west heading");
    app.onOrientation(trueEvent(0, 45, 50));
    poleTab.click();
    assert(text("pole-result") === "0.0° away" && text("phone-altitude") === "45.0°" &&
      text("pole-altitude") === "45.0°" && dot.style.left === "50%" && dot.style.top === "50%" &&
      poleCard.style.getPropertyValue("--aim-color") === "#caeaa1", "Northern pole centered with roll");
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: 1000 } });
    assert(!text("message-text").includes("Location accuracy is poor"), "Accuracy at threshold is not flagged as poor");
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: 1001 } });
    assert(text("message-text").includes("Location accuracy is poor") &&
      text("pole-status").includes("Location accuracy is poor"), "Poor location accuracy warns beside the target");
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: null } });
    assert(text("pole-status").includes("accuracy is unavailable") && text("location-note") === "Accuracy unavailable",
      "Unavailable location accuracy is disclosed");
    app.updateLocation({ coords: { latitude: 0.001, longitude: 0, altitude: null, accuracy: 200 } });
    assert(text("pole-status").includes("crosses the equator"), "Hemisphere uncertainty is disclosed");
    app.updateLocation({ coords: { latitude: 45, longitude: 0, altitude: null, accuracy: 10 } });
    assert(!text("pole-status").includes("Location accuracy"), "Accurate fix clears warning");
    compassTab.click();
    app.onOrientation(trueEvent(0, 35, 0));
    poleTab.click();
    assert(text("pole-result") === "10.0° away", "Readings update while polar tab is hidden");
    app.onOrientation(trueEvent(0, 35, 0));
    assert(text("pole-result") === "10.0° away" && parseFloat(dot.style.top) > 50 &&
      text("pole-status").includes("below center"), "Below pole moves dot down");
    app.onOrientation(trueEvent(0, 55, 0));
    assert(text("pole-result") === "10.0° away" && parseFloat(dot.style.top) < 50 &&
      text("pole-status").includes("above center"), "Above pole moves dot up");
    app.onOrientation(trueEvent(350, 55, 0));
    assert(text("pole-status").includes("right of center and above center"), "Combined directions are grammatical");
    app.onOrientation(trueEvent(350, 45, 0));
    assert(parseFloat(dot.style.left) > 50 && text("pole-result") !== "0.0° away", "Clockwise of north moves dot right");
    app.onOrientation(trueEvent(10, 45, 0));
    assert(parseFloat(dot.style.left) < 50, "Counterclockwise across north moves dot left");
    app.onOrientation(trueEvent(0, 48, 0));
    assert(text("pole-result") === "3.0° away" && poleCard.style.getPropertyValue("--aim-color") === "#e5ca86", "Intermediate target color");
    app.onOrientation(trueEvent(180, 0, 0));
    assert(text("pole-status").includes("edge") && Math.abs(Math.hypot(parseFloat(dot.style.left) - 50, parseFloat(dot.style.top) - 50) - 44) < 0.001, "Far target clamped to edge");
    app.updateLocation({ coords: { latitude: -35, longitude: 149, altitude: null, accuracy: 10 } });
    app.onOrientation(trueEvent(180, 35, 0));
    assert(text("pole-result") === "0.0° away" && text("pole-altitude") === "35.0°", "Southern pole centered");
    app.onOrientation(trueEvent(0, 145, 0));
    assert(text("pole-result") === "0.0° away" && text("phone-altitude") === "35.0°", "Inverted top edge centered");
    app.onOrientation(event(180, null, null));
    assert(dot.hidden && text("pole-status").includes("altitude"), "Missing altitude hides target");
    app.locationError({ code: 1 });
    app.onOrientation(event(180, 35, 0));
    assert(dot.hidden && text("pole-status").includes("location"), "Missing location hides target");
    app.updateLocation({ coords: { latitude: 35, longitude: 149, altitude: null, accuracy: 10 } });
    app.eval("state.declination = null; render()");
    assert(dot.hidden && text("pole-status").includes("True north"), "Missing declination hides target");
    app.eval("state.lastReading = 0; render()");
    assert(dot.hidden && north.hidden && text("north-legend").includes("UNAVAILABLE") && text("phone-altitude") === "—", "Stale sensor reading hides target and north marker");
    app.updateLocation({ coords: { latitude: 35, longitude: 149, altitude: null, accuracy: 10 } });
    app.onOrientation(trueEvent(0, 5, 3));
    app.document.getElementById("calibrate").click();
    assert(text("calibration-status").includes("active") && text("phone-altitude") === "0.0°", "Flat surface calibration zeros altitude with roll");
    assert(app.localStorage.getItem("northstar-surface-calibration") !== null, "Calibration persisted");
    app.onOrientation(trueEvent(0, 40, 3));
    assert(Math.abs(parseFloat(text("phone-altitude")) - 35) < 0.1, "Calibration corrects tilted elevation");
    const compassBeforeReset = text("bearing");
    app.document.getElementById("reset-calibration").click();
    assert(text("phone-altitude") === "40.0°" && text("bearing") === compassBeforeReset &&
      app.localStorage.getItem("northstar-surface-calibration") === null, "Reset removes correction without changing compass");
    app.onOrientation(trueEvent(0, 30, 0));
    app.document.getElementById("calibrate").click();
    assert(text("calibration-status").includes("level surface"), "Calibration rejects tilted reference");
    assert(!app.document.getElementById("accuracy"), "Compass accuracy display removed");
    let permissionCalls = 0;
    let watchdog;
    const requests = [];
    Object.defineProperty(app.navigator, "geolocation", {
      configurable: true, value: {
        getCurrentPosition: (success, error, options) => requests.push({ success, error, options })
      }
    });
    app.DeviceOrientationEvent.requestPermission = async () => { permissionCalls++; return "granted"; };
    app.setInterval = callback => { watchdog = callback; return 0; };
    app.eval("state.locationProblem = ''");
    await app.startCompass();
    assert(permissionCalls === 1 && requests.length === 1 && requests[0].options.maximumAge === 0 &&
      !app.document.getElementById("start").hidden, "Start requests motion permission and fresh location");
    const fix = (latitude, accuracy = 10, timestamp = Date.now()) => ({
      timestamp, coords: { latitude, longitude: 0, altitude: null, accuracy }
    });
    requests[0].success(fix(45));
    app.dispatchEvent(new app.DeviceOrientationEvent("deviceorientationabsolute", { absolute: true, alpha: 30, beta: 30, gamma: 0 }));
    app.eval("state.locationRequestedAt = Date.now() - 60000");
    watchdog();
    assert(requests.length === 2, "Location refreshes after one minute");
    requests[1].success(fix(-35));
    assert(text("pole-altitude") === "35.0°" && text("target-name") === "South celestial pole",
      "Fresh location updates the pole target");
    requests[0].success(fix(10));
    assert(text("target-name") === "South celestial pole", "Superseded location callbacks are ignored");
    app.eval("state.locationTime = Date.now() - 120000; render()");
    assert(text("message-text").includes("Location is stale") && dot.hidden &&
      text("bearing-reference") === "Magnetic north" && !app.document.getElementById("start").hidden,
      "Expired location disables the true-north pole target");
    app.eval("state.lastReading = Date.now() - 6000");
    watchdog();
    assert(!app.document.getElementById("start").hidden && text("message-text").includes("No compass data"), "Retry remains available when no sensor reading arrives");
    await app.startCompass();
    assert(requests.length === 3, "Retry requests a new location");
    requests[2].success(fix(45, 10, Date.now() - 120001));
    assert(text("message-text").includes("outdated location") && dot.hidden, "Outdated GPS fixes are rejected");
    app.eval("state.locationRequestedAt = Date.now() - 60000");
    watchdog();
    requests[3].success(fix(45));
    app.dispatchEvent(new app.DeviceOrientationEvent("deviceorientationabsolute", { absolute: true, alpha: 30, beta: 30, gamma: 0 }));
    assert(permissionCalls === 2 && app.document.getElementById("start").hidden, "Retry starts compass");
    Object.defineProperty(app.document, "hidden", { configurable: true, value: false });
    app.document.dispatchEvent(new app.Event("visibilitychange"));
    assert(requests.length === 5, "Returning to the page refreshes location");
    requests[4].error({ code: 2 });
    assert(dot.hidden && text("message-text").includes("Location unavailable") &&
      !app.document.getElementById("start").hidden, "Location errors disable the pole target and allow retry");
    app.eval("state.locationRequestedAt = Date.now() - 60000");
    watchdog();
    requests[5].success(fix(-20));
    assert(!dot.hidden && text("target-name") === "South celestial pole", "A later location fix recovers from errors");
    app.DeviceOrientationEvent.requestPermission = async () => "denied";
    await app.startCompass();
    assert(!app.document.getElementById("start").hidden && text("message-text").includes("denied") &&
      text("bearing") === "---°", "Denied permission clears readings and allows retry");
    results.textContent = "PASS: tabs, orientation, poles, calibration, declination and manual startup";
  } catch (error) {
    results.textContent = `FAIL: ${error.message}`;
    throw error;
  } finally {
    app.setInterval = originalSetInterval;
    if (originalHidden) Object.defineProperty(app.document, "hidden", originalHidden);
    else delete app.document.hidden;
    if (originalGeolocation) Object.defineProperty(app.navigator, "geolocation", originalGeolocation);
    else delete app.navigator.geolocation;
    if (originalPermission) Object.defineProperty(app.DeviceOrientationEvent, "requestPermission", originalPermission);
    else delete app.DeviceOrientationEvent.requestPermission;
    if (savedCalibration === null) app.localStorage.removeItem("northstar-surface-calibration");
    else app.localStorage.setItem("northstar-surface-calibration", savedCalibration);
  }
});
