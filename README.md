# google-tag-manager-tools

Tools to simplify working with Google Tag Manager.

## Usage

### Configuration

### Commands

#### `list`

The `list` command lists entities in a Google Tag Manager account.

```
gtm-tools list -a <ACCOUNT_ID> -c <CONTAINER_ID> -w <WORKSPACE_ID>
```

The `list` command comes with options:

* `-o, --output <FORMAT>`: outputs the results in one of these formats - `text`,
  `json`, `yaml`, `csv`. This option can be used to backup the configuration of
  a GTM account.

#### `copy`

The `copy` command copies settings from one Google Tag Manager account to
another. This is helpful when working with setting up GTM account for a
non-production environment.

The *default* behavior is that it will perform a `diff` between all the
entities of both the accounts and copy only the changes from the source account
to the target account.

```
gtm-tools copy -sa <SOURCE_ACCOUNT_ID> -sc <SOURCE_CONTAINER_ID> -sw <SOURCE_WORKSPACE_ID> -ta <TARGET_ACCOUNT_ID> -tc <TARGET_CONTAINER_ID> -tw <TARGET_WORKSPACE_ID>
```

The `copy` command comes with options:

* `-r, --reset`: changes the *default* behavior. It resets the target GTM
  account i.e. it <span style="color:red">deletes all entities</span> in the
  target GTM account and copies all the entities from the source account.

#### `diff`

The `diff` command generates a diff of settings between two GTM accounts. This
is helpful when testing new settings in a non-production GTM account and
comparing them before applying the changes in your production account using the
`copy` command.

```
gtm-tools diff -saa <SOURCE_ACCOUNT_ALIAS> -ta <TARGET_ACCOUNT_ALIAS>
```

**Examples:**

* Review changes in non-production account (Account Alias: `DEV_ACCOUNT`) before
  promoting changes to the production account (Account Alias: `PROD_ACCOUNT`):

  ```
  gtm-tools diff -saa DEV_ACCOUNT -taa PROD_ACCOUNT
  ```

  When everything looks good, use the `copy` command to apply the changes from
  the non-production account to the production account:

  ```
  gtm-tools copy -saa DEV_ACCOUNT -taa PROD_ACCOUNT
  ```

#### `reset`

The `reset` command resets a Google Tag Manager account i.e. it
<span style="color:red">deletes all entities</span> in an account.

```
gtm-tools reset -a <ACCOUNT_ID> -c <CONTAINER_ID> -w <WORKSPACE_ID>
```