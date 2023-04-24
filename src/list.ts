import {Command, Option} from 'commander';
import Table from 'cli-table';
import colors from 'colors';
import {TagManagerData, validateSingleAccountOpts} from './core.js';
import {Config} from './config.js';

colors.enable();

async function list(account: TagManagerData) {
  await account.getData();

  // Variables
  const variablesTable = new Table({
    head: ['Variable ID', 'Name', 'Type'],
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

  // Tags
  const tagsTable = new Table({
    head: ['Tag ID', 'Name', 'Type', 'Firing Triggers (Trigger ID)'],
  });
  account.tags?.forEach(tag => {
    tagsTable.push([
      tag.tagId as string,
      tag.name as string,
      tag.type as string,
      tag.firingTriggerId
        ?.map(
          x =>
            `${account.triggers?.get(x)?.name} (${
              account.triggers?.get(x)?.triggerId
            })`
        )
        .join(', ') as string,
    ]);
  });
  console.log('==> Tags'.blue, `(${account.tags.size} tags)`);
  console.log(tagsTable.toString());
  console.log('\n');

  // Triggers
  const triggersTable = new Table({
    head: ['Trigger ID', 'Name', 'Type'],
  });
  account.triggers?.forEach(trigger => {
    triggersTable.push([
      trigger.triggerId as string,
      trigger.name as string,
      trigger.type as string,
    ]);
  });
  console.log('==> Triggers'.blue, `(${account.triggers.size} triggers)`);
  console.log(triggersTable.toString());
  console.log('\n');
}

const list_cmd = new Command('list');
const listCmdOptions = {
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

list_cmd.addOption(listCmdOptions.primaryOption);
listCmdOptions.conflictingOptions.forEach(op => list_cmd.addOption(op));

list_cmd.action(async () => {
  try {
    validateSingleAccountOpts(listCmdOptions, list_cmd.opts());
  } catch (e) {
    list_cmd.error(`error: ${(e as Error).message}`);
  }

  const accountAlias: string = list_cmd.opts().accountAlias;
  let accountId: string = list_cmd.opts().account;
  let containerId: string = list_cmd.opts().container;
  let workspaceId: string = list_cmd.opts().workspace;

  if (accountAlias !== undefined) {
    const config = new Config();
    const accountConfig = config.getAccount(accountAlias);
    accountId = accountConfig?.accountId as string;
    containerId = accountConfig?.containerId as string;
    workspaceId = accountConfig?.workspaceId as string;
  }

  const account: TagManagerData = new TagManagerData(
    accountId,
    containerId,
    workspaceId
  );
  await account.init();

  await list(account);
});

export {list_cmd, list};
