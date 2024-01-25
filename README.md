# gtm-tools

CLI tool to simplify working with Google Tag Manager (GTM).

If you work with a GTM account and need its entities into a development account
for testing GTM settings and find it difficult to keep the two accounts in sync,
you will find `gtm-tools` handy.

With `gtm-tools`, you can:
* List entities in a GTM account
* Copy entities from one GTM account to another
* Get diff between entities of two GTM accounts
* Reset a GTM account

## Use Cases

`gtm-tools` is targeted towards developers using GTM to manager 3rd party
integrations on their web applications. Most of the use-cases are to cater to developers' needs.

Here are some of the use cases:

1. Take a quick look into your GTM account without using the web console
2. Take the backup of your production GTM account into a backup account
3. Prepare a new GTM account with prod-like configuration for your development
   environment.
4. Once you test your changes in your GTM account for the development
   environment, check the diff (like git) between your dev and production GTM
   accounts. If the changes look good, copy the changes to the production GTM
   account.
5. If you mess up your dev GTM account and want to start from scratch, reset it
   quickly and then copy the configuration from production to start over.

## Installation

```
npm install gtm-tools
```

## Configuration

`gtm-tools` works between two or more GTM accounts. Before proceeding, make sure
that you have access to your accounts.

### Prepare the configuration

Start with the example config.

```
cp example.config.json config.json
```

Edit `config.json` to add as many GTM accounts you would like to work with.
Typical users will have two accounts and their `config.json` can look like this:

```json
{
  "tagManagerAPI": {
    "defaultRateLimitBatchSize": 1,
    "defaultRateLimitBatchDelay": 5000
  },
  "accounts": [
    {
      "alias": "gtm-prod",
      "accountId": "12345678",
      "containerId": "12345678",
      "workspaceId": "2",
      "isResettable": false,
      "variableOverrides": {}
    },
    {
      "alias": "gtm-dev",
      "accountId": "87654321",
      "containerId": "87654321",
      "workspaceId": "2",
      "isResettable": true,
      "variableOverrides": {}
    }
  ]
}
```

To find `accountId`, `containerId` and `workspaceId` for your accounts, log in
to your GTM account web console. The URL of the web console has all the required
details. For example, the URL for web console for **gtm-prod** account could
like this:
```
https://tagmanager.google.com/?authuser=1#/container/accounts/12345678/containers/12345678/workspaces/2
```

### Configure credentials for accessing Google Tag Manager API

`gtm-tools` needs a Service Account with access to Google Tag Manager API to
work. Setting up a Service Account with proper accesses is a multi-step complex
process. Head over the to the [detailed docs
here](docs/GOOGLE-API-CREDENTIALS-SETUP.md) to setup the Service Account and
generate your credentials.

Now that you have your credentials in a JSON file (let's say
`credentials.json`), you are ready to tell `gtm-tools` how to use these
credentials by setting the environment variable `GOOGLE_APPLICATION_CREDENTIALS`.

```
export GOOGLE_APPLICATION_CREDENTIALS=<path-to-credentials>/credentials.json
```

Now test these credentials with `gtm-tools` by running the following command:

```
gtm-tools --config config.json list -aa gtm-prod
```

The command should execute successfully showing the configuration of your
account.

### Configuration Options

| Configuration Key                          | Type                | Default | Required | Description                                                                                                                                                                                                  |
|--------------------------------------------|---------------------|---------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `tagManagerAPI.defaultRateLimitBatchSize`  | int                 | 1       |          | Batch size for the count of API requests to be made to Tag Manager API without a delay. After this batch, a delay will be injected before the next batch starts, controlled by `defaultRateLimitBatchDelay`. |
| `tagManagerAPI.defaultRateLimitBatchDelay` | int                 | 5000    |          | Add delay (in milliseconds) between subsequent batches of requests to Tag Manager API to avoid rate limiting.                                                                                                |
| `accounts[].alias`                         | string              |         | Yes      | Human-friendly alias to refer to the account while using  `gtm-tools`.                                                                                                                                       |
| `accounts[].accountId`                     | string              |         | Yes      | Account ID of the GTM account.                                                                                                                                                                               |
| `accounts[].containerId`                   | string              |         | Yes      | Container ID of the container within the GTM account.                                                                                                                                                        |
| `accounts[].workspaceId`                   | string              |         | Yes      | Workspace ID of the workspace within the container to use.                                                                                                                                                   |
| `accounts[].isResettable`                  | boolean             | false   |          | Prevents `gtm-tools` from resetting an account accidentally. When set to  `false`, `gtm-tools reset` command will not execute.                                                                               |
| `accounts[].variableOverrides{}`           | Map<string, string> | {}      |          | Key-value mapping of a **Variable Name** in GTM container with a value to replace while copying the variable to this account. Example: `{ "Hotjar Account ID": "hotjar-dev-account-id-1234" }`               |

## Usage

`gtm-tools` supports several commands. Get help using `--help` option:

```
gtm-tools --help
```

Here is an example usage:

```
gtm-tools --config config.json list -aa <gtm-account-alias-in-config>
```

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

While copying, `gtm-tools` will look for variables that have been provided an
override using `variableOverrides` configuration for the target account and set
the value provided in the configuration. This comes handy to easily change
things like configurations or credentials for 3rd party services in different environments.

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