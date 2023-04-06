# google-tag-manager-tools

Tools to simplify working with Google Tag Manager.

## Usage

### Configuration

### Commands

#### `list`

The `list` command lists entities in a Google Tag Manager account.

```
gtm-tools list -a <ACCOUNT_ID> -c <CONTAINER_ID>
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
gtm-tools copy -sa <SOURCE_ACCOUNT_ID> -sc <SOURCE_CONTAINER_ID> -ta <TARGET_ACCOUNT_ID> -tc <TARGET_CONTAINER_ID>
```

The `copy` command comes with options:

* `-r, --reset`: changes the *default* behavior. It resets the target GTM
  account i.e. it <span style="color:red">deletes all entities</span> in the
  target GTM account and copies all the entities from the source account.

#### `diff`

The `diff` command generates a diff of settings between two GTM accounts. This
is helpful when adding or updating settings in a non-production GTM account. The
`diff` command can be handy in understanding what changed between the production
and non-production accounts, and accordingly promote changes carefully to the
production account.

```
gtm-tools diff -sa <SOURCE_ACCOUNT_ID> -sc <SOURCE_CONTAINER_ID> -ta <TARGET_ACCOUNT_ID> -tc <TARGET_CONTAINER_ID>
```

#### `reset`

The `reset` command resets a Google Tag Manager account i.e. it
<span style="color:red">deletes all entities</span> in an account.

```
gtm-tools reset -sa <SOURCE_ACCOUNT_ID> -sc <SOURCE_CONTAINER_ID> -ta <TARGET_ACCOUNT_ID> -tc <TARGET_CONTAINER_ID>
```