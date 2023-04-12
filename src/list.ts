import {Command} from 'commander';
import Table from 'cli-table';
import colors from 'colors';
import {TagManagerData} from './core';

colors.enable();

async function list(account: TagManagerData) {
  await account.getData();

  const variablesTable = new Table({
    head: ['Variable ID', 'Name', 'Type', 'Last Edited'],
  });
  account.variables.forEach(val => {
    variablesTable.push([val.variableId as string, val.name as string, val.type as string]);
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

const list_cmd = new Command('list');
list_cmd
  .requiredOption('-a, --account <ACCOUNT_ID>', "GTM account's Account ID")
  .requiredOption('-c, --container <CONTAINER_ID>', "GTM account's Container ID");

list_cmd.action(async () => {
  const accountId: string = list_cmd.opts().account;
  const containerId: string = list_cmd.opts().container;
  const account: TagManagerData = new TagManagerData(accountId, containerId);
  await account.init();

  await list(account);
});

export {list_cmd, list};
