import {Command} from 'commander';
import colors from 'colors';
import inquirer from 'inquirer';
import {list} from './list.js';
import {TagManagerData} from './core.js';
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
    '-sw, --source-workspace <SOURCE_WORKSPACE_ID>',
    "Source GTM account's Workspace ID"
  )
  .requiredOption(
    '-ta, --target-account <TARGET_ACCOUNT_ID>',
    "Target GTM account's Account ID"
  )
  .requiredOption(
    '-tc, --target-container <TARGET_CONTAINER_ID>',
    "Target GTM account's Container ID"
  )
  .requiredOption(
    '-tw, --target-workspace <TARGET_WORKSPACE_ID>',
    "Target GTM account's Workspace ID"
  )
  .option(
    '-r, --reset',
    'Reset the target GTM account and copy all entities from the source account'
  );

copy_cmd.action(async () => {
  const sourceAccountId: string = copy_cmd.opts().sourceAccount;
  const sourceContainerId: string = copy_cmd.opts().sourceContainer;
  const sourceWorkspaceId: string = copy_cmd.opts().sourceWorkspace;
  const targetAccountId: string = copy_cmd.opts().targetAccount;
  const targetContainerId: string = copy_cmd.opts().targetContainer;
  const targetWorkspaceId: string = copy_cmd.opts().targetWorkspace;
  const isReset: boolean = copy_cmd.opts().reset;

  const sourceAccount: TagManagerData = new TagManagerData(sourceAccountId, sourceContainerId, sourceWorkspaceId);
  await sourceAccount.init();
  const targetAccount: TagManagerData = new TagManagerData(targetAccountId, targetContainerId, targetWorkspaceId, true);
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
          await targetAccount.getData();
          await targetAccount.reset();
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
      });
  }
});

export {copy_cmd};
