# Privacy Policy

**Stride** — last updated: March 2026

## Summary

Stride does not collect, store, or transmit any personal data to its developers or third-party analytics services. All user data remains on your device.

## Data stored locally

Stride stores the following data exclusively on your device at `%APPDATA%\stride\`:

- Workspace and panel configuration
- Bookmarks
- Notes widget content
- Application preferences and settings
- Google OAuth tokens (if you connect a Google account)

This data never leaves your device unless you explicitly back it up.

## Third-party services

Stride may communicate with the following external services, initiated exclusively by user action:

| Service | Purpose | Data sent | Privacy policy |
|---------|---------|-----------|----------------|
| Open-Meteo | Weather widget | City name or coordinates (only if widget is enabled and location is granted) | https://open-meteo.com/en/terms |
| Google OAuth | Account sign-in | Standard OAuth flow (openid, email, profile scopes) | https://policies.google.com/privacy |
| GitHub Releases | Auto-update check | None — checks a public JSON endpoint | https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement |

Stride does not operate any backend server. No data is sent to the Stride developers.

## WebView2

Stride uses the Microsoft WebView2 engine to display web content inside panels. When you navigate to a website inside a panel, that website's own privacy policy applies. Stride does not intercept or log the content of web pages you visit.

Google OAuth tokens are stored locally in SQLite and are used solely to authenticate requests you initiate within the app.

## Focus Mode

Focus Mode blocks ad-related network requests at the native level using EasyList and EasyPrivacy domain lists, which are bundled with the app and updated periodically from public sources. No browsing data is logged or transmitted during this process.

## Updates

Stride checks for updates by fetching a public JSON file from GitHub Releases on launch. No identifying information is sent during this check.

## Changes to this policy

If Stride introduces features that collect user data in the future, this policy will be updated and the change will be noted in the release notes.

## Contact

For questions about this policy, open an issue at https://github.com/bramuchile/stride/issues
