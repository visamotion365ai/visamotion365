# iOS Release Kit

## Install today as a Home Screen app

The current build is an installable iOS/iPadOS PWA. It has the app manifest,
Apple touch icon, standalone display mode, safe-area spacing, and offline page
fallback. To install it:

1. Open the deployed site in **Safari** on iPhone or iPad.
2. Tap **Share**.
3. Choose **Add to Home Screen**, keep the short name **VisaMotion**, then tap
   **Add**.

## Native App Store build

This repository does not contain a signed `.ipa` or an App Store Connect release.
Those require an Apple Developer account, a macOS machine with Xcode, a confirmed
bundle identifier, app privacy disclosures, and Apple signing/provisioning. Do
not submit the PWA as a native app until a native wrapper and its review
requirements have been completed.

## PWA checks before release

- Use HTTPS on the final domain.
- Confirm Safari can load the manifest and `/icons/apple-touch-icon.png`.
- Install from Safari's Share sheet and verify standalone launch.
- Open once online, then test the cached page offline; API/AI tasks require a
  network connection.
- Confirm the selected model and Browser Use credentials are valid in Settings.
