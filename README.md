# Northstar

A static, mobile-friendly compass for a **rough** telescope polar alignment. Host the files at the root of a GitHub Pages site (or any HTTPS static host); there is no server-side code, build step, external API, or tracking. The page and bundled model work without additional network requests after the files have loaded. Location and sensor data stay in the browser.

## Use

1. Open the HTTPS site on a phone with a magnetometer. Tap **Start compass** and allow orientation/motion and location permissions. Some browsers require these to be enabled in site or device settings.
2. Point the phone's physical top edge along the mount's polar axis. The phone can be tilted: the bearing is the top edge's direction projected onto the horizontal plane, measured clockwise from north. Move away from the mount and other metal, magnets, cables, and electronics to avoid magnetic interference; calibrate the phone with a figure-eight motion.
3. Switch between the **Compass** and **Polar alignment** tabs without restarting the sensors. On the Polar alignment tab, use **Pole target** to move the dot to the crosshair. The target is 0° azimuth in the northern hemisphere or 180° in the southern hemisphere, at an altitude equal to the absolute value of your latitude. The app combines the top edge's bearing and altitude to show the angular separation from that celestial pole. The outer ring represents 15°; readings farther away are clamped to its edge. Green indicates within 1°, amber within 5°, and orange farther away. These colors describe the calculated difference, **not measurement accuracy**.
4. Finish using a polar scope, plate solving, or another star-based method.

The fullscreen control is disabled on browsers that do not support the Fullscreen API, including some iPhone Safari versions. Browser permissions and sensor availability vary; a desktop or a phone without an absolute compass will not produce a bearing. The app ignores relative orientation readings, but accepts tilted readings. When the top edge is nearly vertical, its horizontal projection becomes very small and the bearing can be unstable; at exactly vertical it is undefined. The app warns rather than hiding the sensor reading.

## Declination and accuracy

The bundled WMM2025 spherical-harmonic model calculates local declination for the current date and location directly, rather than looking up a fixed-resolution map. Its values are displayed to 0.01°, so a 0.25° change is represented. East declination is added to a magnetic bearing, west declination subtracted. GPS altitude is used when available and in the model's supported range, otherwise sea level is assumed. The model is valid from 2025-01-01 through 2029-12-31 UTC; outside that interval the app will not apply it. Update the model before 2030.

The browser's absolute heading reference is not consistently exposed across implementations. The default assumes a **magnetic** sensor heading (including Apple's documented `webkitCompassHeading`). If you have independently verified that your browser's heading is already referenced to true north, change **Compass settings** to true north to avoid double correction. Relative, arbitrary-reference alpha readings are not accepted. The physical top of the phone remains the reference in either screen orientation.

On browsers providing absolute orientation, the top-edge heading is derived from the orientation angles, including a 180° reversal when the top edge passes vertical. On Safari the app uses the browser-provided `webkitCompassHeading`; its behavior and accuracy at different tilts depend on the device and browser, so verify it against a known bearing.

The pole target requires location, a true-referenced heading, and the device's beta orientation angle. If any of these are unavailable, the target dot is hidden instead of guessing. Phone altitude is the elevation of the physical top edge relative to the horizon, not GPS height. Keep the phone's top edge parallel to the mount's polar axis; the reading describes the phone, not the mount itself. Near the geographic poles, heading becomes especially unstable. Magnetic interference from the mount can make the displayed dot misleading.

The decimal display and model resolution are **not a promise of 0.25° pointing accuracy**. Phone sensors, calibration, local magnetic anomalies, time, location errors, nearby metal, and weak magnetic fields near the poles can cause much larger errors. The model represents the Earth's main field, not local interference. This app is not a substitute for precise polar alignment or navigation.

## Development

All files can be served as static files, for example `python -m http.server 8000`, then open `http://localhost:8000`. Real sensors generally require a mobile device and HTTPS. To deploy, push the files to GitHub and enable Pages for the branch and root folder.

With the local server running, open `http://localhost:8000/tests/compass.html` to run the browser-based orientation regression tests.

The files in `vendor/` are [magvar 2.0.1](https://github.com/dpyeates/magvar) by Darren Yeates, pinned to commit `148ee7d`, with small wrappers added to load its CommonJS modules directly in a browser. Its MIT license is in `vendor/LICENSE`. The model is based on [NOAA's World Magnetic Model 2025](https://www.ncei.noaa.gov/products/world-magnetic-model).
