import {Command} from 'commander';
import colors from 'colors';
import inquirer from 'inquirer';
import {list} from './list';

colors.enable();

async function copy(sourceAccountId: string, sourceContainerId: string, targetAccountId: string, targetContainerId: string) {
  console.log('Copied entities succsessfully'.green);
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

  if (isReset) {
    await list(sourceAccountId, sourceContainerId);
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
          await copy(sourceAccountId, sourceContainerId, targetAccountId, targetContainerId);
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
