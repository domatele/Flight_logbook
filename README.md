# Flight Logbook PWA

A private, iPhone-friendly, offline-first pilot logbook.

## Use on iPhone

This is a web app, not an App Store application. Host the folder on an HTTPS website, open the URL in Safari, then choose **Share → Add to Home Screen → Open as Web App**.

All flight data is stored locally in the browser using IndexedDB. Use **Export backup** regularly.

## Important

This is an initial standalone implementation inspired by the feature set of vsimakhin/web-logbook. It is not a drop-in replacement for that project's database/backend and has not been certified or approved by EASA.

## Hosting

Any static HTTPS host works. GitHub Pages is one option:
1. Create a GitHub repository.
2. Upload all files in this folder.
3. Enable GitHub Pages for the repository.
4. Open the generated HTTPS URL in Safari.
5. Add it to the Home Screen.

For a private repository, check your chosen hosting plan's access rules before putting personal logbook data online. The app's flight database itself is stored locally on the iPhone; the hosted files do not contain your flight records.
