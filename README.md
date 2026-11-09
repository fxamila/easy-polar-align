# Northstar

A static, mobile-friendly compass for a **rough** telescope polar alignment. Host the files at the root of a GitHub Pages site (or any HTTPS static host); there is no server-side code, build step, external API, or tracking. The page and bundled model work without additional network requests after the files have loaded. Location and sensor data stay in the browser.

## Use

1. Open the HTTPS site on a phone with a magnetometer. Tap **Start compass** and allow orientation/motion and location permissions. Some browsers require these to be enabled in site or device settings.
2. Hold the phone flat, screen up, and point its physical top edge along the mount's polar axis. The bearing is clockwise from north. Move away from the mount and other metal, magnets, cables, and electronics to avoid magnetic interference; calibrate the phone with a figure-eight motion.
3. Aim for 0° in the northern hemisphere or 180° in the southern hemisphere. Set the mount's altitude to your latitude. Finish using a polar scope, plate solving, or another star-based method.

The fullscreen control is disabled on browsers that do not support the Fullscreen API, including some iPhone Safari versions. Browser permissions and sensor availability vary; a desktop or a phone without an absolute compass will not produce a bearing. The app deliberately ignores relative orientation and readings while the phone is tilted more than 15°.

## Declination and accuracy

The bundled WMM2025 spherical-harmonic model calculates local declination for the current date and location directly, rather than looking up a fixed-resolution map. Its values are displayed to 0.01°, so a 0.25° change is represented. East declination is added to a magnetic bearing, west declination subtracted. GPS altitude is used when available and in the model's supported range, otherwise sea level is assumed. The model is valid from 2025-01-01 through 2029-12-31 UTC; outside that interval the app will not apply it. Update the model before 2030.

The browser's absolute heading reference is not consistently exposed across implementations. The default assumes a **magnetic** sensor heading (including Apple's documented `webkitCompassHeading`). If you have independently verified that your browser's heading is already referenced to true north, change **Compass settings** to true north to avoid double correction. Relative, arbitrary-reference alpha readings are not accepted. The physical top of the phone remains the reference in either screen orientation.

The decimal display and model resolution are **not a promise of 0.25° pointing accuracy**. Phone sensors, calibration, local magnetic anomalies, time, location errors, nearby metal, and weak magnetic fields near the poles can cause much larger errors. The model represents the Earth's main field, not local interference. This app is not a substitute for precise polar alignment or navigation.

## Development

All files can be served as static files, for example `python -m http.server 8000`, then open `http://localhost:8000`. Real sensors generally require a mobile device and HTTPS. To deploy, push the files to GitHub and enable Pages for the branch and root folder.

The files in `vendor/` are [magvar 2.0.1](https://github.com/dpyeates/magvar) by Darren Yeates, pinned to commit `148ee7d`, with small wrappers added to load its CommonJS modules directly in a browser. Its MIT license is in `vendor/LICENSE`. The model is based on [NOAA's World Magnetic Model 2025](https://www.ncei.noaa.gov/products/world-magnetic-model).
