import {Command, Option} from 'commander';
import colors from 'colors';
import inquirer from 'inquirer';
import {list} from './list.js';
import {validateSingleAccountOpts} from './core.js';
import {TagManagerData} from './core.js';
import {Config} from './config.js';
import Table from 'cli-table';

colors.enable(); // TODO: may be this can move to just index.ts?

const copy_cmd = new Command('copy');
const copyCmdSourceAccountOptions = {
  primaryOption: new Option(
    '-saa, --source-account-alias <SOURCE_ACCOUNT_ALIAS>',
    "Source GTM account's alias as specified in the config"
  ),
  conflictingOptions: [
    new Option(
      '-sa, --source-account <SOURCE_ACCOUNT_ID>',
      "Source GTM account's Account ID"
    ).conflicts('sourceAccountAlias'),
    new Option(
      '-sc, --source-container <SOURCE_CONTAINER_ID>',
      "Source GTM account's Container ID"
    ).conflicts('sourceAccountAlias'),
    new Option(
      '-sw, --source-workspace <SOURCE_WORKSPACE_ID>',
      "Source GTM account's Workspace ID"
    ).conflicts('sourceAccountAlias'),
  ],
};
const copyCmdTargetAccountOptions = {
  primaryOption: new Option(
    '-taa, --target-account-alias <TARGET_ACCOUNT_ALIAS>',
    "Target GTM account's alias as specified in the config"
  ),
  conflictingOptions: [
    new Option(
      '-ta, --target-account <TARGET_ACCOUNT_ID>',
      "Target GTM account's Account ID"
    ).conflicts('targetAccountAlias'),
    new Option(
      '-tc, --target-container <TARGET_CONTAINER_ID>',
      "Target GTM account's Container ID"
    ).conflicts('targetAccountAlias'),
    new Option(
      '-tw, --target-workspace <TARGET_WORKSPACE_ID>',
      "Target GTM account's Workspace ID"
    ).conflicts('targetAccountAlias'),
  ],
};

copy_cmd.addOption(copyCmdSourceAccountOptions.primaryOption);
copyCmdSourceAccountOptions.conflictingOptions.forEach(op =>
  copy_cmd.addOption(op)
);
copy_cmd.addOption(copyCmdTargetAccountOptions.primaryOption);
copyCmdTargetAccountOptions.conflictingOptions.forEach(op =>
  copy_cmd.addOption(op)
);
copy_cmd.option(
  '-r, --reset',
  'Reset the target GTM account and copy all entities from the source account'
);

copy_cmd.action(async () => {
  try {
    validateSingleAccountOpts(copyCmdSourceAccountOptions, {
      accountAlias: copy_cmd.opts().sourceAccountAlias,
      account: copy_cmd.opts().sourceAccount,
      workspace: copy_cmd.opts().sourceWorkspace,
      container: copy_cmd.opts().sourceContainer,
    });
  } catch (e) {
    copy_cmd.error(`error: ${(e as Error).message}`);
  }

  try {
    validateSingleAccountOpts(copyCmdTargetAccountOptions, {
      accountAlias: copy_cmd.opts().targetAccountAlias,
      account: copy_cmd.opts().targetAccount,
      workspace: copy_cmd.opts().targetWorkspace,
      container: copy_cmd.opts().targetContainer,
    });
  } catch (e) {
    copy_cmd.error(`error: ${(e as Error).message}`);
  }

  const sourceAccountAlias: string = copy_cmd.opts().sourceAccountAlias;
  let sourceAccountId: string = copy_cmd.opts().sourceAccount;
  let sourceContainerId: string = copy_cmd.opts().sourceContainer;
  let sourceWorkspaceId: string = copy_cmd.opts().sourceWorkspace;
  const targetAccountAlias: string = copy_cmd.opts().targetAccountAlias;
  let targetAccountId: string = copy_cmd.opts().targetAccount;
  let targetContainerId: string = copy_cmd.opts().targetContainer;
  let targetWorkspaceId: string = copy_cmd.opts().targetWorkspace;
  const isReset: boolean = copy_cmd.opts().reset;

  if (sourceAccountAlias !== undefined) {
    const config = new Config();
    const sourceAccountConfig = config.getAccount(sourceAccountAlias);
    sourceAccountId = sourceAccountConfig?.accountId as string;
    sourceContainerId = sourceAccountConfig?.containerId as string;
    sourceWorkspaceId = sourceAccountConfig?.workspaceId as string;
  }

  if (targetAccountAlias !== undefined) {
    const config = new Config();
    const targetAccountConfig = config.getAccount(targetAccountAlias);
    targetAccountId = targetAccountConfig?.accountId as string;
    targetContainerId = targetAccountConfig?.containerId as string;
    targetWorkspaceId = targetAccountConfig?.workspaceId as string;
  }

  const sourceAccount: TagManagerData = new TagManagerData(
    sourceAccountId,
    sourceContainerId,
    sourceWorkspaceId
  );
  await sourceAccount.init();
  const targetAccount: TagManagerData = new TagManagerData(
    targetAccountId,
    targetContainerId,
    targetWorkspaceId,
    true
  );
  await targetAccount.init();

  if (isReset) {
    await list(sourceAccount);
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'continueReset',
          message:
            'Do you want to continue to reset the target GTM account and copy all entities from the source GTM account?',
          default: false,
        },
      ])
      .then(async answers => {
        if (answers.continueReset) {
          console.log(
            'Resetting target GTM account and copying entities from source GTM account...'
              .gray
          );
          await targetAccount.getData();
          await targetAccount.reset();
          const responses = await targetAccount.copyDataFromAccount(
            sourceAccount
          );

          const variablesTable = new Table({
            head: [
              'Variable ID',
              'Name',
              'Type',
              '👉 Copy Status',
              '✨ New Variable ID',
            ],
          });
          responses.variables.forEach(val => {
            const sourceVariable = sourceAccount.variables.get(
              val.sourceVariableId
            );
            variablesTable.push([
              val.sourceVariableId as string,
              sourceVariable?.name as string,
              sourceVariable?.type as string,
              val.response.error === undefined
                ? '✅ Copy Successful'
                : `❌ Copy Failed \n\n${val.response.error?.message ?? ''}`,
              val.targetVariableId === undefined ? '' : val.targetVariableId,
            ]);
          });
          console.log(
            '==> Variables'.blue,
            `(${sourceAccount.variables.size} variables)`
          );
          console.log(variablesTable.toString());
          console.log('\n');

          const triggersTable = new Table({
            head: [
              'Trigger ID',
              'Name',
              'Type',
              '👉 Copy Status',
              '✨New Trigger ID',
            ],
          });
          responses.triggers.forEach(val => {
            const sourceTrigger = sourceAccount.triggers.get(
              val.sourceTriggerId
            );
            triggersTable.push([
              val.sourceTriggerId as string,
              sourceTrigger?.name as string,
              sourceTrigger?.type as string,
              val.response.error === undefined
                ? '✅ Copy Successful'
                : `❌ Copy Failed \n\n${val.response.error?.message ?? ''}`,
              val.targetTriggerId === undefined ? '' : val.targetTriggerId,
            ]);
          });
          console.log(
            '==> Triggers'.blue,
            `(${sourceAccount.triggers.size} triggers)`
          );
          console.log(triggersTable.toString());
          console.log('\n');

          const tagsTable = new Table({
            head: [
              'Tag ID',
              'Name',
              'Type',
              'Firing Triggers (Trigger ID)',
              '👉 Copy Status',
              '✨ New Tag ID',
              '✨ New Firing Triggers (New Trigger ID)',
            ],
          });
          responses.tags.forEach(val => {
            const sourceTag = sourceAccount.tags.get(val.sourceTagId);
            tagsTable.push([
              val.sourceTagId as string,
              sourceTag?.name as string,
              sourceTag?.type as string,
              (sourceTag?.firingTriggerId
                ?.map(
                  x =>
                    `${sourceAccount.triggers?.get(x)?.name} (${
                      sourceAccount.triggers?.get(x)?.triggerId
                    })`
                )
                .join(', ') ?? '') as string,
              val.response.error === undefined
                ? '✅ Copy Successful'
                : `❌ Copy Failed \n\n${val.response.error?.message ?? ''}`,
              val.targetTagId === undefined ? '' : val.targetTagId,
              (targetAccount.tags
                .get(val.targetTagId)
                ?.firingTriggerId?.map(
                  x =>
                    `${targetAccount.triggers?.get(x)?.name} (${
                      targetAccount.triggers?.get(x)?.triggerId
                    })`
                )
                .join(', ') ?? '') as string,
            ]);
          });
          console.log('==> Tags'.blue, `(${sourceAccount.tags.size} tags)`);
          console.log(tagsTable.toString());
          console.log('\n');
        }
      })
      .catch(error => {
        console.log(error);
      });
  }
});

export {copy_cmd};
