import {Command} from 'commander';
import Table from 'cli-table';
import colors from 'colors';
import {TagManagerData} from './core';

colors.enable();

const list = new Command('list');
list
  .option(
    '-a, --account <ACCOUNT_ID>',
    "GTM account's Account ID"
  )
  .option(
    '-c, --container <CONTAINER_ID>',
    "GTM account's Container ID"
  );

list.action(async () => {
  const accountId: string = list.opts().account;
  const containerId: string = list.opts().container;

  const account: TagManagerData = new TagManagerData(
    accountId,
    containerId
  );
  await account.init();

  await account.getData();

  const variablesTable = new Table({
    head: ['Name', 'Type', 'Last Edited'],
  });
  account.variables.forEach(val => {
    variablesTable.push([val.name as string, val.type as string]);
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
});

export {list};
