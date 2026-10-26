# TrelloHelper

**Version:** 0.1.0  
**Platform:** Firefox  
**Manifest:** Version 2  
**Developed and designed by:** [Rauh-Solutions](https://rauh-solutions.de/)

TrelloHelper is an independent Firefox add-on that adds small, useful features to help with your day-to-day work on Trello. It is open-source, lightweight, and personally tested. The project is designed to grow over time as more features are added.

## Features

### Trello Link Redirect

Trello Link Redirect intercepts top-level HTTPS navigations to `trello.com` and `www.trello.com`. It classifies each URL as a card link (`/c/...`), board link (`/b/...`), or another Trello page, then applies the user's configured rule.

By default, card and board links are sent to the desktop app, while other Trello pages stay in Firefox. The feature is intended for systems where the Trello desktop application is installed. Without the desktop app, external links may not open as expected. The extension preserves the original path, query string, and fragment by replacing only the `https://` scheme with `trello://`. The installed desktop app must support the resulting URL format. Firefox usually asks for permission the first time an external Trello link is opened.

## Configuration

Click the TrelloHelper toolbar button to enable or disable automatic redirection. The `ON` or `OFF` badge indicates the current state. Right-click the toolbar button and choose **Open TrelloHelper settings…** to configure the Link Redirect feature.

The settings page lets you:

- Enable or disable automatic redirection.
- Choose whether card links should open in the desktop app.
- Choose whether board links should open in the desktop app.
- Choose whether other Trello pages should open in the desktop app or remain in Firefox.
- Close the original Firefox tab after Firefox loses focus, with a short safeguard delay.

Preferences are saved locally using `browser.storage.local`. The extension does not send preferences or browsing data to an external server.

## Project structure

```text
TrelloHelper/
├── manifest.json
├── background.js
├── README.md
├── icons/
│   ├── trellohelper.svg
│   ├── trellohelper-32.png
│   ├── trellohelper-48.png
│   ├── trellohelper-64.png
│   ├── trellohelper-96.png
│   ├── trellohelper-128.png
│   ├── card-light.svg
│   └── board-light.svg
└── options/
    ├── options.html
    ├── options.css
    └── options.js
```

- `manifest.json` defines extension metadata, permissions, toolbar icons, and the settings page.
- `background.js` handles URL classification, redirects, the toolbar toggle, settings synchronization, and focus-based tab closing.
- `icons/trellohelper.svg` is the scalable main logo used on the settings page. PNG variants are used for the Firefox toolbar, while `card-light.svg` and `board-light.svg` are scalable vector icons for the Cards and Boards redirect rules. Their SVG artwork remains crisp at different display sizes; the board icon shows three card markers per column.
- `options/options.html` defines the settings page structure.
- `options/options.css` styles the settings page, including light and dark themes.
- `options/options.js` loads, validates, displays, and saves preferences.

## Temporary installation for testing

1. Extract the ZIP archive to a folder.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select the project's `manifest.json` file.
4. Click the TrelloHelper toolbar button to toggle automatic redirection.
5. Right-click the toolbar button and select **Open TrelloHelper settings…** to open the settings page.

Temporary add-ons are removed when Firefox closes. For normal installation in a standard release build of Firefox, the packaged extension must be signed by Mozilla.

## Notes and limitations

- This project uses Manifest V2 to remain consistent with the supplied starting project.
- Only top-level navigations to `https://trello.com/*` and `https://www.trello.com/*` are intercepted.
- The focus-based tab-closing option detects whether Firefox has lost focus. It cannot confirm that Trello itself successfully opened or received focus.
- The extension retains the current URL conversion method (`https://` to `trello://`). Support for specific URL formats depends on the installed Trello desktop app.

## Attribution and disclaimer

TrelloHelper is developed and designed by [Rauh-Solutions](https://rauh-solutions.de/).

TrelloHelper is an independent project. It is not affiliated with, endorsed by, or an official add-on of Atlassian or Trello.
