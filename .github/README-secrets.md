# Required Secrets

## APP_ID

GitHub App ID for `lvis-ci-bot`.

- App installed on: `lvis-project/lvis-app`
- Permissions: `contents:read`, `pull_requests:write`
- Required by: `.github/workflows/drift-check.yml`
- Rotation: App ID does not rotate; regenerate the private key instead.

## APP_PRIVATE_KEY

Private key (PEM) for the `lvis-ci-bot` GitHub App.

- Required by: `.github/workflows/drift-check.yml`
- Rotation: Regenerate from GitHub App settings → Private keys. Rotate annually.
  After generating a new key, update this secret and delete the old key from the App settings.
