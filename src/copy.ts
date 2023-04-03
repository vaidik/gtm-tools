import {Command} from 'commander';
import Table from 'cli-table';
import colors from 'colors';
import {TagManagerData} from './core';

colors.enable();

const copy = new Command('copy');
copy
  .option(
    '-sa, --source-account <SOURCE_ACCOUNT_ID>',
    "Source GTM account's Account ID"
  )
  .option(
    '-sc, --source-container <SOURCE_CONTAINER_ID>',
    "Source GTM account's Container ID"
  )
  .option(
    '-ta, --target-account <TARGET_ACCOUNT_ID>',
    "Target GTM account's Account ID"
  )
  .option(
    '-tc, --target-container <TARGET_CONTAINER_ID>',
    "Target GTM account's Container ID"
  );

copy.action(async () => {
  const sourceAccountId: string = copy.opts().sourceAccount;
  const sourceContainerId: string = copy.opts().sourceContainer;

  const account: TagManagerData = new TagManagerData(
    sourceAccountId,
    sourceContainerId
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

export {copy};
