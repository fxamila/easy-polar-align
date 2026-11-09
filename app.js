"use strict";

const $ = id => document.getElementById(id);
const elements = {
  bearing: $("bearing"), label: $("bearing-label"), live: $("live-status"),
  reference: $("reference"), target: $("target"), message: $("message-text"),
  start: $("start"), location: $("location"), locationNote: $("location-note"),
  declination: $("declination"), modelNote: $("model-note"), magnetic: $("magnetic"),
  targetName: $("target-name"), hemisphere: $("hemisphere"),
  sensorReference: $("sensor-reference"), fullscreen: $("fullscreen"),
  poleCard: document.querySelector(".pole-card"), sightDot: $("sight-dot"),
  poleResult: $("pole-result"), poleStatus: $("pole-status"),
  phoneAltitude: $("phone-altitude"), poleAltitude: $("pole-altitude")
};

const state = {
  heading: null, altitude: null, lastReading: 0, location: null, declination: null,
  sensorProblem: "Start the compass and allow location for a true north reading.",
  locationProblem: "", started: false, timer: null
};

const normalize = angle => ((angle % 360) + 360) % 360;
const displayAngle = angle => `${(Math.round(normalize(angle) * 10) % 3600 / 10).toFixed(1)}°`;
const modelValid = date => date >= new Date("2025-01-01T00:00:00Z") && date < new Date("2030-01-01T00:00:00Z");

const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(tab.getAttribute("aria-controls")).hidden = !active;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", event => {
    let index = tabs.indexOf(tab);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}

function calculateDeclination(latitude, longitude, altitude, date) {
  const julianDays = date.getTime() / 86400000 + 2440587.5;
  return window.WMMModules["./magvar"].calculateMagVar(julianDays, latitude, longitude, altitude);
}

function updateLocation(position) {
  const { latitude, longitude, altitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    clearLocation();
    state.locationProblem = "The device returned an invalid location. Try again.";
    render();
    return;
  }
  const height = Number.isFinite(altitude) && altitude >= -1000 && altitude <= 850000 ? altitude / 1000 : 0;
  state.location = { latitude, longitude };
  state.locationProblem = "";
  const date = new Date();
  state.declination = modelValid(date) ? calculateDeclination(latitude, longitude, height, date) : null;
  if (state.declination !== null && !Number.isFinite(state.declination)) {
    state.declination = null;
    state.locationProblem = "Could not calculate declination at this location.";
  }
  if (!modelValid(date)) state.locationProblem = "WMM2025 is valid only through 2029. Update the model before using true north.";
  else if (Math.abs(latitude) >= 85) state.locationProblem = "Near a geographic or magnetic pole, compass headings and declination can be unreliable.";
  elements.location.textContent = `${Math.abs(latitude).toFixed(3)}° ${latitude < 0 ? "S" : "N"}, ${Math.abs(longitude).toFixed(3)}° ${longitude < 0 ? "W" : "E"}`;
  elements.locationNote.textContent = Number.isFinite(accuracy) ? `Approx. ±${Math.round(accuracy)} m` : "Location connected";
  elements.hemisphere.textContent = `${latitude < 0 ? "Southern" : "Northern"} hemisphere`;
  elements.targetName.textContent = latitude < 0 ? "South celestial pole" : "North celestial pole";
  elements.target.textContent = latitude < 0 ? "TARGET 180°" : "TARGET 000°";
  elements.declination.textContent = state.declination === null ? "Unavailable" : `${Math.abs(state.declination).toFixed(2)}° ${state.declination < 0 ? "W" : "E"}`;
  elements.modelNote.textContent = "WMM2025 · " + (height === 0 ? "sea level" : "GPS altitude");
  render();
}

function clearLocation() {
  state.location = null;
  state.declination = null;
  elements.location.textContent = "Not connected";
  elements.locationNote.textContent = "Needed for true north";
  elements.declination.textContent = "—";
  elements.modelNote.textContent = "WMM2025 · local model";
  elements.targetName.textContent = "—";
  elements.hemisphere.textContent = "Waiting for location";
  elements.target.textContent = "TARGET —";
}

function locationError(error) {
  clearLocation();
  state.locationProblem = error.code === 1
    ? "Location permission denied. Enable it in browser settings for true north."
    : "Location unavailable. Check location services and try again.";
  render();
}

function onOrientation(event) {
  let heading = null;
  if (Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
    heading = event.webkitCompassHeading;
  } else if ((event.absolute || event.type === "deviceorientationabsolute") && Number.isFinite(event.alpha)) {
    // The projected top edge reverses direction when beta passes vertical.
    heading = normalize(360 - event.alpha + (Number.isFinite(event.beta) && Math.cos(event.beta * Math.PI / 180) < 0 ? 180 : 0));
  } else {
    return;
  }
  state.lastReading = Date.now();
  state.heading = normalize(heading);
  state.altitude = Number.isFinite(event.beta)
    ? Math.asin(Math.sin(event.beta * Math.PI / 180)) * 180 / Math.PI
    : null;
  const warnings = [];
  if (Number.isFinite(event.beta) && Math.abs(Math.cos(event.beta * Math.PI / 180)) < Math.sin(5 * Math.PI / 180)) {
    warnings.push("The phone's top edge is nearly vertical; its horizontal bearing is unstable or undefined.");
  }
  if (Number.isFinite(event.webkitCompassAccuracy) && event.webkitCompassAccuracy < 0) {
    warnings.push("Compass accuracy is unavailable. Calibrate your phone with a figure-eight motion.");
  } else if (Number.isFinite(event.webkitCompassAccuracy) && event.webkitCompassAccuracy > 15) {
    warnings.push(`Compass reports ±${Math.round(event.webkitCompassAccuracy)}° accuracy. Calibrate away from metal.`);
  }
  state.sensorProblem = warnings.join(" ");
  render();
}

function poleOffset(bearing, altitude, targetBearing, targetAltitude) {
  const radians = Math.PI / 180;
  const azimuth = (bearing - targetBearing) * radians;
  const elevation = altitude * radians;
  const targetElevation = targetAltitude * radians;
  const east = Math.cos(elevation) * Math.sin(azimuth);
  const up = Math.sin(elevation) * Math.cos(targetElevation) -
    Math.cos(elevation) * Math.cos(azimuth) * Math.sin(targetElevation);
  const forward = Math.sin(elevation) * Math.sin(targetElevation) +
    Math.cos(elevation) * Math.cos(azimuth) * Math.cos(targetElevation);
  const radial = Math.hypot(east, up);
  const separation = Math.atan2(radial, forward) / radians;
  // The antipode has no unique direction; place it on the right edge.
  const x = radial < 1e-12 ? (forward < 0 ? 1 : 0) : east / radial;
  const y = radial < 1e-12 ? 0 : up / radial;
  return { separation, x, y };
}

function renderPole(headingAvailable, isTrue, bearing) {
  const altitudeAvailable = headingAvailable && state.altitude !== null;
  elements.phoneAltitude.textContent = altitudeAvailable ? `${state.altitude.toFixed(1)}°` : "—";
  elements.poleAltitude.textContent = state.location ? `${Math.abs(state.location.latitude).toFixed(1)}°` : "—";

  if (!headingAvailable || !state.location || !isTrue || !altitudeAvailable) {
    elements.sightDot.hidden = true;
    elements.poleResult.textContent = "—";
    elements.poleCard.style.removeProperty("--aim-color");
    elements.poleStatus.textContent = !headingAvailable ? "Waiting for a compass reading." :
      !state.location ? "Allow location to find the celestial pole." :
      !isTrue ? "True north correction is unavailable; the pole target needs a true bearing." :
      "Phone altitude is unavailable from your browser.";
    return;
  }

  const targetBearing = state.location.latitude < 0 ? 180 : 0;
  const offset = poleOffset(bearing, state.altitude, targetBearing, Math.abs(state.location.latitude));
  const distance = Math.min(offset.separation / 15, 1) * 44;
  elements.sightDot.hidden = false;
  elements.sightDot.style.left = `${50 + offset.x * distance}%`;
  elements.sightDot.style.top = `${50 - offset.y * distance}%`;
  elements.poleCard.style.setProperty("--aim-color", offset.separation <= 1 ? "#caeaa1" : offset.separation <= 5 ? "#e5ca86" : "#d49b7c");
  elements.poleResult.textContent = `${offset.separation.toFixed(1)}° away`;
  const directions = [];
  if (Math.abs(offset.x * offset.separation) >= 0.1) directions.push(offset.x < 0 ? "left" : "right");
  if (Math.abs(offset.y * offset.separation) >= 0.1) directions.push(offset.y < 0 ? "below" : "above");
  elements.poleStatus.textContent = offset.separation <= 1 ? "Close to the pole target (sensor estimate)." :
    `Dot is ${directions.join(" and ")} of center.` +
    (offset.separation > 15 ? " It stays at the edge until within 15°." : " Move it to the center.");
}

function render() {
  const headingAvailable = state.heading !== null && Date.now() - state.lastReading < 5000;
  const sensorIsTrue = elements.sensorReference.value === "true";
  const hasCorrection = state.location !== null && state.declination !== null && modelValid(new Date());
  const isTrue = headingAvailable && (sensorIsTrue || hasCorrection);
  let bearing = state.heading;
  if (headingAvailable && !sensorIsTrue && hasCorrection) bearing = normalize(bearing + state.declination);

  elements.bearing.innerHTML = `${headingAvailable ? displayAngle(bearing).slice(0, -1) : "---"}<span>°</span>`;
  elements.reference.textContent = isTrue ? "TRUE NORTH" : headingAvailable ? "MAGNETIC NORTH" : "TRUE NORTH";
  elements.magnetic.textContent = headingAvailable && !sensorIsTrue ? displayAngle(state.heading) : "—";
  elements.live.classList.toggle("active", headingAvailable);
  elements.live.innerHTML = `<span></span> ${headingAvailable ? "LIVE" : state.started ? "WAITING" : "NOT STARTED"}`;

  if (!headingAvailable) {
    elements.label.textContent = "AWAITING COMPASS";
  } else if (!isTrue) {
    elements.label.textContent = "MAGNETIC BEARING";
  } else if (!state.location) {
    elements.label.textContent = "TRUE BEARING";
  } else {
    const target = state.location.latitude < 0 ? 180 : 0;
    const difference = ((bearing - target + 540) % 360) - 180;
    elements.label.textContent = Math.abs(difference) < 0.05
      ? "ALIGNED IN AZIMUTH"
      : `${Math.abs(difference).toFixed(1)}° ${difference < 0 ? "COUNTERCLOCKWISE" : "CLOCKWISE"} OF TARGET`;
  }
  renderPole(headingAvailable, isTrue, bearing);
  elements.message.textContent = [state.sensorProblem, state.locationProblem].filter(Boolean).join(" ") ||
    (headingAvailable && !isTrue ? "Magnetic bearing only. Allow location to correct to true north." :
      "Keep your phone away from metal. Use a star-based method for precise alignment.");
}

elements.start.addEventListener("click", async () => {
  if (!window.isSecureContext) {
    state.sensorProblem = "Compass and location require HTTPS (or localhost). Open this page on GitHub Pages.";
    render();
    return;
  }
  if (!("DeviceOrientationEvent" in window)) {
    state.sensorProblem = "This browser does not support device orientation. Try a supported mobile browser.";
    render();
    return;
  }
  elements.start.disabled = true;
  window.removeEventListener("deviceorientation", onOrientation);
  window.removeEventListener("deviceorientationabsolute", onOrientation);
  clearInterval(state.timer);
  state.heading = null;
  state.altitude = null;
  clearLocation();
  state.started = true;
  state.sensorProblem = "Waiting for a compass reading.";
  state.locationProblem = "";
  render();
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(updateLocation, locationError, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  } else {
    state.locationProblem = "Location is unavailable in this browser; true north correction needs location.";
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        state.sensorProblem = "Motion and orientation permission denied. Enable it in browser settings and try again.";
        render();
        return;
      }
    }
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientation", onOrientation);
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (Date.now() - state.lastReading >= 5000) {
        state.heading = null;
        state.sensorProblem = "No compass data received. Check permissions, use a supported phone, and try again.";
        render();
      }
    }, 5000);
    state.lastReading = Date.now();
    elements.start.querySelector("span").textContent = "Retry compass & location";
    render();
  } catch (error) {
    state.sensorProblem = `Could not start the compass: ${error.message || "permission request failed"}.`;
    render();
  } finally {
    elements.start.disabled = false;
  }
});

elements.sensorReference.addEventListener("change", render);

function updateFullscreen() {
  const active = Boolean(document.fullscreenElement);
  const label = active ? "Exit fullscreen" : "Enter fullscreen";
  elements.fullscreen.setAttribute("aria-label", label);
  elements.fullscreen.title = label;
}

elements.fullscreen.disabled = !document.fullscreenEnabled;
if (elements.fullscreen.disabled) elements.fullscreen.title = "Fullscreen is not supported by this browser";
elements.fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    state.sensorProblem = `Fullscreen unavailable: ${error.message || "request failed"}.`;
    render();
  }
});
document.addEventListener("fullscreenchange", updateFullscreen);
