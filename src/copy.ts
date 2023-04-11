import {Command} from 'commander';
import colors from 'colors';
import inquirer from 'inquirer';
import {list} from './list';
import {TagManagerData} from './core';
import Table from 'cli-table';

colors.enable();

async function copy(sourceAccount: TagManagerData, targetAccount: TagManagerData) {
  console.log('Copied entities successfully'.green);
  return await targetAccount.copyData(sourceAccount.variables);
}

const copy_cmd = new Command('copy');
copy_cmd
  .requiredOption(
    '-sa, --source-account <SOURCE_ACCOUNT_ID>',
    "Source GTM account's Account ID"
  )
  .requiredOption(
    '-sc, --source-container <SOURCE_CONTAINER_ID>',
    "Source GTM account's Container ID"
  )
  .requiredOption(
    '-ta, --target-account <TARGET_ACCOUNT_ID>',
    "Target GTM account's Account ID"
  )
  .requiredOption(
    '-tc, --target-container <TARGET_CONTAINER_ID>',
    "Target GTM account's Container ID"
  )
  .option(
    '-r, --reset',
    'Reset the target GTM account and copy all entities from the source account'
  );

copy_cmd.action(async () => {
  const sourceAccountId: string = copy_cmd.opts().sourceAccount;
  const sourceContainerId: string = copy_cmd.opts().sourceContainer;
  const targetAccountId: string = copy_cmd.opts().targetAccount;
  const targetContainerId: string = copy_cmd.opts().targetContainer;
  const isReset: boolean = copy_cmd.opts().reset;

  const sourceAccount: TagManagerData = new TagManagerData(sourceAccountId, sourceContainerId);
  await sourceAccount.init();
  const targetAccount: TagManagerData = new TagManagerData(targetAccountId, targetContainerId);
  await targetAccount.init();

  if (isReset) {
    await list(sourceAccount);
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'continueReset',
          message: 'Do you want to continue to reset the target GTM account and copy all entities from the source GTM account?',
          default: false,
        }
      ])
      .then(async (answers) => {
        if (answers.continueReset) {
          console.log('Resetting target GTM account and copying entities from source GTM account...'.gray);
          const responses = await copy(sourceAccount, targetAccount);
          const variablesTable = new Table({
            head: ['Variable ID', 'Name', 'Type', 'Copy Status', 'Reason'],
          });
          sourceAccount.variables.forEach((val, variableId) => {
            variablesTable.push([
              variableId as string,
              val.name as string,
              val.type as string,
              (responses.get(variableId)?.error === undefined) ? 'Copy Successful' : 'Copy Failed',
            ]);
          });
          console.log('==> Variables'.blue, `(${sourceAccount.variables.size} variables)`);
          console.log(variablesTable.toString());
          console.log('\n');
        }
      })
      .catch((error) => {
        console.log(error);
        // if (error.isTtyError) {
        //   // Prompt couldn't be rendered in the current environment
        // } else {
        //   // Something else went wrong
        // }
      });
  }
});

export {copy_cmd};
