"use strict";

const $ = id => document.getElementById(id);
const elements = {
  bearing: $("bearing"), label: $("bearing-label"), live: $("live-status"),
  reference: $("reference"), target: $("target"), message: $("message-text"),
  start: $("start"), location: $("location"), locationNote: $("location-note"),
  declination: $("declination"), modelNote: $("model-note"), magnetic: $("magnetic"),
  targetName: $("target-name"), hemisphere: $("hemisphere"),
  sensorReference: $("sensor-reference"), fullscreen: $("fullscreen")
};

const state = {
  heading: null, lastReading: 0, location: null, declination: null,
  sensorProblem: "Start the compass and allow location for a true north reading.",
  locationProblem: "", started: false, timer: null
};

const normalize = angle => ((angle % 360) + 360) % 360;
const displayAngle = angle => `${(Math.round(normalize(angle) * 10) % 3600 / 10).toFixed(1)}°`;
const modelValid = date => date >= new Date("2025-01-01T00:00:00Z") && date < new Date("2030-01-01T00:00:00Z");

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
      ? "POINTING AT POLAR TARGET"
      : `${Math.abs(difference).toFixed(1)}° ${difference < 0 ? "WEST" : "EAST"} OF POLAR TARGET`;
  }
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
