# google-tag-manager-tools

Tools to simplify working with Google Tag Manager.

## Usage

### Configuration

### Commands

#### `copy`

The `copy` command copies settings from one Google Taga Manager account to
another. This is helpful when working with setting up GTM account for use in non-production environments.

```
gtm-tools copy --sa <SOURCE_ACCOUNT_ID> --sc <SOURCE_CONTAINER_ID> --ta <TARGET_ACCOUNT_ID> --tc <TARGET_CONTAINER_ID>
```

#### `diff`

The `diff` command generates a diff of settings between two GTM accounts. This
is helpful when adding or updating settings in a non-production GTM account. The
`diff` command can be handy in understanding what changed between the production
and non-production accounts, and accordingly promote changes carefully to the
production account.

```
gtm-tools diff --from <from_account_id> --to <to_account_id>
```