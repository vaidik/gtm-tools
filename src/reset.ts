import {Command, Option} from 'commander';
import Table from 'cli-table';
import colors from 'colors';
import inquirer from 'inquirer';
import {list} from './list.js';
import {TagManagerData, validateSingleAccountOpts} from './core.js';
import {Config} from './config.js';

colors.enable();

async function reset(account: TagManagerData) {
  await account.getData();

  const variablesTable = new Table({
    head: ['Variable ID', 'Name', 'Type', 'Last Edited'],
  });
  account.variables.forEach(val => {
    variablesTable.push([
      val.variableId as string,
      val.name as string,
      val.type as string,
    ]);
  });
  console.log('==> Variables'.blue, `(${account.variables.size} variables)`);
  console.log(variablesTable.toString());
  console.log('\n');

  const tagsTable = new Table({
    head: ['Name', 'Type', 'Firing Triggers', 'Last Edited'],
  });
  account.tags?.forEach(tag => {
    tagsTable.push([
      tag.name as string,
      tag.type as string,
      tag.firingTriggerId
        ?.map(x => account.triggers?.get(x)?.name)
        .join(', ') as string,
    ]);
  });
  console.log('==> Tags'.blue, `(${account.tags.size} tags)`);
  console.log(tagsTable.toString());
  console.log('\n');
}

const reset_cmd = new Command('reset');
const resetCmdOptions = {
  primaryOption: new Option(
    '-aa, --account-alias <ACCOUNT_ALIAS>',
    "GTM account's alias as specified in the config"
  ),
  conflictingOptions: [
    new Option(
      '-a, --account <ACCOUNT_ID>',
      "GTM account's Account ID"
    ).conflicts('accountAlias'),
    new Option(
      '-c, --container <CONTAINER_ID>',
      "GTM account's Container ID"
    ).conflicts('accountAlias'),
    new Option(
      '-w, --workspace <WORKSPACE_ID>',
      "GTM account's Workspace ID"
    ).conflicts('accountAlias'),
  ],
};
reset_cmd.addOption(resetCmdOptions.primaryOption);
resetCmdOptions.conflictingOptions.forEach(op => reset_cmd.addOption(op));

reset_cmd.action(async () => {
  try {
    validateSingleAccountOpts(resetCmdOptions, reset_cmd.opts());
  } catch (e) {
    reset_cmd.error(`error: ${(e as Error).message}`);
  }

  const accountAlias: string = reset_cmd.opts().accountAlias;
  let accountId: string = reset_cmd.opts().account;
  let containerId: string = reset_cmd.opts().container;
  let workspaceId: string = reset_cmd.opts().workspace;
  let isResettable = true;

  if (accountAlias !== undefined) {
    const config = new Config();
    const accountConfig = config.getAccount(accountAlias);
    accountId = accountConfig?.accountId as string;
    containerId = accountConfig?.containerId as string;
    workspaceId = accountConfig?.workspaceId as string;
    isResettable = accountConfig?.isResettable as boolean;
  }

  if (!isResettable) {
    reset_cmd.error(
      `error: This GTM account (Account ID: ${accountId}) is not resettable.`
    );
  }

  const account: TagManagerData = new TagManagerData(
    accountId,
    containerId,
    workspaceId,
    isResettable
  );
  await account.init();
  await list(account);

  if (
    account.variables.size === 0 &&
    account.tags.size === 0 &&
    account.triggers.size === 0
  ) {
    console.log('There is no data in this GTM account to delete'.yellow);
    return;
  }

  inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'continueReset',
        message: 'Do you want to continue to reset the this GTM account?',
        default: false,
      },
    ])
    .then(async answers => {
      if (answers.continueReset) {
        console.log('Resetting GTM account...'.gray);
        await account.reset();
        console.log('Resetting GTM account complete'.green);
      }
    })
    .catch(error => {
      console.log(error);
    });
});

export {reset_cmd, reset};
