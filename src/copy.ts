import {Command} from 'commander';
import colors from 'colors';
import {list} from './list';

colors.enable();

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

  await list(sourceAccountId, sourceContainerId);
});

export {copy_cmd};
