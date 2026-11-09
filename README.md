# Northstar

**A browser-based polar alignment assistant for equatorial telescope mounts.**

[Open Northstar](https://fxamila.github.io/virtual_northstar/) on your phone to get a rough starting alignment when the celestial pole is difficult to see. The app combines the phone's compass and orientation sensors with your location to estimate where to point the mount.

> **Use this for rough alignment only.** Phone sensors and nearby metal can produce errors of several degrees or more. A green indicator or a small displayed offset does not guarantee accurate polar alignment. Finish with a polar scope, plate solving, drift alignment, or another star-based method.

## What you need

- An equatorial mount with an accessible reference surface parallel to its polar axis.
- A phone with a working compass and orientation sensors, and a supported mobile browser.
- An HTTPS connection to the site and permission to use your location and sensors. GitHub Pages provides HTTPS.
- A reasonably clear area away from magnets, metal, cables, and electronics for checking compass readings. The mount itself can distort the compass, so compare readings away from it.

Sensor access and compass behavior vary between devices and browsers. Desktop browsers and phones without an absolute compass may not provide a usable heading.

## Quick start

1. Open [Northstar](https://fxamila.github.io/virtual_northstar/) on your phone. Tap **Start compass**, then allow location and motion/orientation access when prompted. Some browsers require this tap to request sensor access, even if location permission was previously granted.
2. Check the message on the page. If it reports missing permissions or sensor data, use **Retry compass & location** and check your browser and phone settings.
3. If necessary, calibrate the phone's compass with a figure-eight motion away from metal. Open the **Compass** tab to see the bearing and its north reference.
4. Open **Polar alignment**. Switch between views by tapping the tabs or swiping horizontally across a view. Point the phone's physical top edge in the direction of the mount's polar axis, with the phone aligned to a suitable surface parallel to that axis. Adjust the mount in azimuth and altitude to move the dot toward the center of the crosshair. The displayed reading describes the phone, so an incorrectly positioned phone will not represent the mount's axis.
5. Check for magnetic interference by comparing with a reading away from the mount. Once roughly aligned, use a star-based method to fine-tune.

The phone can be tilted. Its bearing is the direction of its top edge projected onto the horizontal plane. When the top edge is nearly vertical, that projection is small and the bearing can be unstable; at exactly vertical it is undefined.

## Understanding the pole target

The target is the **north celestial pole** in the northern hemisphere and the **south celestial pole** in the southern hemisphere. The app uses your latitude to set the pole's altitude above the horizon:

| Hemisphere | Target true bearing | Target altitude |
| --- | --- | --- |
| Northern | 0° | Your latitude |
| Southern | 180° | The absolute value of your latitude |

The crosshair compares the target with the phone's estimated pointing direction. Left and right represent counterclockwise and clockwise azimuth relative to the target; above and below represent the vertical component of the offset.

- The number shows estimated angular separation from the pole.
- The outer ring represents **15°**. A dot farther than 15° away stays on the outer edge until it gets closer.
- **Green:** within 1°. **Amber:** more than 1° and up to 5°. **Orange:** more than 5°.
- **Phone altitude** is the angle of the pointing direction above the horizon, not GPS elevation.
- The **red mark** on the outer ring shows north relative to the phone's physical top edge, represented as up on the diagram. It rotates as the phone turns: for example, north is on the left when the top edge points east. The label says whether it represents true or magnetic north. It is separate from the crosshair's pole-offset axes and may be unreliable when the phone's top edge is nearly vertical.

These are calculated offsets, not measured error bounds. If the dot is unavailable, the app may be missing a compass heading, location, a valid true-north correction, or tilt data.

## Optional: calibrate the phone's resting surface

Use this only when a camera bump or case causes the phone to rest at an angle on an otherwise level surface:

1. Open **Optional surface calibration** on the Polar alignment tab.
2. Put the phone screen-up and still on a genuinely level surface. Use the same case and contact points you plan to use against the mount.
3. Once a compass and tilt reading is available, tap **Calibrate level surface**. The phone must be within 15° of level in both pitch and roll.
4. Check that the calibration status says it is active. Recalibrate if the case or contact points change; tap **Reset** to remove it.

The pitch and roll correction is saved in the browser's local storage when available and is applied only to the polar target, not the compass display. It cannot compensate for a reference surface that is not level, movement during calibration, or magnetic interference. This is separate from the phone's compass calibration.

## Compass and true north

The Compass tab shows the phone's bearing in degrees clockwise from north. With a valid location, Northstar uses the bundled **World Magnetic Model 2025** to calculate local magnetic declination and applies it to the sensor heading. East declination is added and west declination is subtracted. GPS altitude is used when available and within the model's supported range; otherwise the calculation assumes sea level.

WMM2025 is valid from **January 1, 2025 through December 31, 2029 UTC**. The model calculates declination directly for the location and date rather than looking it up on a fixed grid. Declination is displayed to 0.01°, but that resolution does **not** imply that the phone can point to within 0.25°.

If location or a valid declination is unavailable, the compass shows **magnetic north** instead and the pole target is disabled. The app assumes the sensor heading is magnetic; browsers do not consistently expose its reference. If a browser already supplies true north, applying declination again will produce an incorrect result. Check the reading against a known bearing, especially on a new device.

Browser sensor readings cannot guarantee compass accuracy. Calibrate away from metal and check the heading against a known bearing.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| No compass data | Use a compatible phone and browser over HTTPS. Allow motion/orientation access, check browser settings, and retry. A device without a magnetometer or absolute orientation may not work. |
| Location denied or unavailable | Enable location services and site permission, then retry. Without location, magnetic bearing may still be shown, but the polar target cannot be calculated. |
| Readings jump or disagree | Calibrate the compass with a figure-eight motion. Move away from the mount, metal objects, magnets, cables, and electronics. Compare with a known bearing. |
| Surface calibration fails | Ensure a fresh compass and tilt reading is present. Place the phone screen-up and nearly level, then try again. |
| Fullscreen is unavailable | The fullscreen button is disabled if the browser does not support the Fullscreen API, including some iPhone Safari versions. |
| True north correction is unavailable | Check that the device date is correct and within the WMM2025 validity period; the model must be updated for 2030 and later. |

## Privacy and offline behavior

Northstar is a static HTML, CSS, and JavaScript site. Location, sensor readings, and declination calculations stay in the browser; the app has no server-side code, tracking, or external data API. Surface calibration is stored locally when supported.

Once the page and its bundled files have loaded, calculations do not require further network requests. There is no offline installer or service worker, so reopening the site without a connection is not guaranteed.

## Run locally or host your own copy

No build step or package installation is required. Serve the project folder with any static server, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000` on the same device running the server. A phone accessing a computer's server over a LAN address such as `http://192.168.1.10:8000` is **not** using a secure context; its browser may block location and sensors. Use HTTPS for testing on a separate phone.

To publish your own copy on GitHub Pages, push the files to a repository, then enable Pages for the branch and root folder. Open the resulting HTTPS URL on the phone.

The page's canonical and social URLs and [`sitemap.xml`](./sitemap.xml) point to the original GitHub Pages site. If you host your own copy, update these URLs to match your deployment. For Google discovery, you can verify the site in [Google Search Console](https://search.google.com/search-console/) and submit its sitemap or request indexing. Crawling and search placement are not guaranteed.

For browser-based regression tests, run the local server and open `http://localhost:8000/tests/compass.html`. The tests simulate sensor data; they do not replace testing on a physical phone.

## Model and attribution

The bundled model is based on [NOAA's World Magnetic Model 2025](https://www.ncei.noaa.gov/products/world-magnetic-model). The `vendor/` files contain [magvar 2.0.1](https://github.com/dpyeates/magvar) by Darren Yeates, pinned to commit `148ee7d` and wrapped for direct browser use. Its MIT license is included in [`vendor/LICENSE`](./vendor/LICENSE).
