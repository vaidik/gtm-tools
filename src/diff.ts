import {Command, Option} from 'commander';
import colors from 'colors';
import yaml from 'yaml';
import {validateSingleAccountOpts} from './core.js';
import {TagManagerData} from './core.js';
import {Config} from './config.js';
import Table from 'cli-table';
import {tagmanager_v2} from 'googleapis';
import {Change, diffLines} from 'diff';

colors.enable(); // TODO: may be this can move to just index.ts?

interface Indexable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

enum RowChangeTypeEnum {
  Added = 'green',
  Removed = 'red',
  Modified = 'yellow',
  Unchanged = 'grey',
}

function stringifyDiff(
  objectDiff: Change[],
  filterOut?: 'added' | 'removed' | undefined
): string {
  let result = '';
  objectDiff.forEach(part => {
    // green for additions, red for deletions
    // grey for common parts
    if (filterOut !== undefined && (part as Indexable)[filterOut as string]) {
      return;
    }
    const color = part.added
      ? RowChangeTypeEnum.Added
      : part.removed
      ? RowChangeTypeEnum.Removed
      : RowChangeTypeEnum.Unchanged;
    result += part.value[color];
  });
  return result;
}

const diffCmd = new Command('diff');
const diffCmdSourceAccountOptions = {
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
const diffCmdTargetAccountOptions = {
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

diffCmd.addOption(diffCmdSourceAccountOptions.primaryOption);
diffCmdSourceAccountOptions.conflictingOptions.forEach(op =>
  diffCmd.addOption(op)
);
diffCmd.addOption(diffCmdTargetAccountOptions.primaryOption);
diffCmdTargetAccountOptions.conflictingOptions.forEach(op =>
  diffCmd.addOption(op)
);
diffCmd.option(
  '-u, --show-unchanged-changes',
  'Include unchanged changes in the diff list'
);

diffCmd.action(async () => {
  try {
    validateSingleAccountOpts(diffCmdSourceAccountOptions, {
      accountAlias: diffCmd.opts().sourceAccountAlias,
      account: diffCmd.opts().sourceAccount,
      workspace: diffCmd.opts().sourceWorkspace,
      container: diffCmd.opts().sourceContainer,
    });
  } catch (e) {
    diffCmd.error(`error: ${(e as Error).message}`);
  }

  try {
    validateSingleAccountOpts(diffCmdTargetAccountOptions, {
      accountAlias: diffCmd.opts().targetAccountAlias,
      account: diffCmd.opts().targetAccount,
      workspace: diffCmd.opts().targetWorkspace,
      container: diffCmd.opts().targetContainer,
    });
  } catch (e) {
    diffCmd.error(`error: ${(e as Error).message}`);
  }

  const sourceAccountAlias: string = diffCmd.opts().sourceAccountAlias;
  let sourceAccountId: string = diffCmd.opts().sourceAccount;
  let sourceContainerId: string = diffCmd.opts().sourceContainer;
  let sourceWorkspaceId: string = diffCmd.opts().sourceWorkspace;
  const targetAccountAlias: string = diffCmd.opts().targetAccountAlias;
  let targetAccountId: string = diffCmd.opts().targetAccount;
  let targetContainerId: string = diffCmd.opts().targetContainer;
  let targetWorkspaceId: string = diffCmd.opts().targetWorkspace;
  const showUnchangedChanges: boolean = diffCmd.opts().showUnchangedChanges;

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
  await Promise.all([sourceAccount.getData(), targetAccount.getData()]);

  await diff(
    sourceAccountAlias,
    targetAccountAlias,
    sourceAccount,
    targetAccount,
    showUnchangedChanges
  );
});

export async function diff(
  sourceAccountAlias: string,
  targetAccountAlias: string,
  sourceAccount: TagManagerData,
  targetAccount: TagManagerData,
  showUnchangedChanges = false
): Promise<boolean> {
  const hasVariableChanges = outputEntityDiff(
    sourceAccountAlias,
    targetAccountAlias,
    'Variable',
    'variableId',
    sourceAccount.variables,
    targetAccount.variables,
    {
      Type: (
        sourceVariable?: tagmanager_v2.Schema$Variable,
        targetVariable?: tagmanager_v2.Schema$Variable
      ): Change[] => {
        const typeDiff = diffLines(
          targetVariable?.type !== undefined
            ? (targetVariable?.type as string) + '\n'
            : '',
          sourceVariable?.type !== undefined
            ? (sourceVariable?.type as string) + '\n'
            : ''
        );
        return typeDiff;
      },
      Parameters: (
        sourceVariable?: tagmanager_v2.Schema$Variable,
        targetVariable?: tagmanager_v2.Schema$Variable
      ): Change[] => {
        return diffLines(
          targetVariable?.parameter !== undefined
            ? yaml.stringify(targetVariable?.parameter)
            : '',
          sourceVariable?.parameter !== undefined
            ? yaml.stringify(sourceVariable?.parameter)
            : ''
        );
      },
    },
    showUnchangedChanges
  );

  const hasTriggerChanges = outputEntityDiff(
    sourceAccountAlias,
    targetAccountAlias,
    'Trigger',
    'triggerId',
    sourceAccount.triggers,
    targetAccount.triggers,
    {
      Type: (
        sourceTrigger?: tagmanager_v2.Schema$Trigger,
        targetTrigger?: tagmanager_v2.Schema$Trigger
      ): Change[] => {
        const typeDiff = diffLines(
          targetTrigger?.type !== undefined
            ? (targetTrigger?.type as string) + '\n'
            : '',
          sourceTrigger?.type !== undefined
            ? (sourceTrigger?.type as string) + '\n'
            : ''
        );
        return typeDiff;
      },
      'Custom Event Filter': (
        sourceTrigger?: tagmanager_v2.Schema$Trigger,
        targetTrigger?: tagmanager_v2.Schema$Trigger
      ): Change[] => {
        return diffLines(
          targetTrigger?.customEventFilter !== undefined
            ? yaml.stringify(targetTrigger?.customEventFilter)
            : '',
          sourceTrigger?.customEventFilter !== undefined
            ? yaml.stringify(sourceTrigger?.customEventFilter)
            : ''
        );
      },
    },
    showUnchangedChanges
  );

  const hasTagChanges = outputEntityDiff(
    sourceAccountAlias,
    targetAccountAlias,
    'Tag',
    'tagId',
    sourceAccount.tags,
    targetAccount.tags,
    {
      Type: (
        sourceTag?: tagmanager_v2.Schema$Tag,
        targetTag?: tagmanager_v2.Schema$Tag
      ): Change[] => {
        const typeDiff = diffLines(
          targetTag?.type !== undefined
            ? (targetTag?.type as string) + '\n'
            : '',
          sourceTag?.type !== undefined
            ? (sourceTag?.type as string) + '\n'
            : ''
        );
        return typeDiff;
      },
      'Firing Triggers': (
        sourceTag?: tagmanager_v2.Schema$Tag,
        targetTag?: tagmanager_v2.Schema$Tag
      ): Change[] => {
        return diffLines(
          targetTag?.firingTriggerId !== undefined
            ? yaml.stringify(
                targetTag?.firingTriggerId?.map(
                  triggerId => targetAccount.triggers.get(triggerId)?.name
                )
              )
            : '',
          sourceTag?.firingTriggerId !== undefined
            ? yaml.stringify(
                sourceTag?.firingTriggerId?.map(
                  triggerId => sourceAccount.triggers.get(triggerId)?.name
                )
              )
            : ''
        );
      },
      Parameters: (
        sourceTag?: tagmanager_v2.Schema$Tag,
        targetTag?: tagmanager_v2.Schema$Tag
      ): Change[] => {
        return diffLines(
          targetTag?.parameter !== undefined
            ? yaml.stringify(targetTag?.parameter)
            : '',
          sourceTag?.parameter !== undefined
            ? yaml.stringify(sourceTag?.parameter)
            : ''
        );
      },
    },
    showUnchangedChanges
  );

  return Promise.resolve(
    hasVariableChanges || hasTriggerChanges || hasTagChanges
  );
}

function outputEntityDiff<
  T extends {name?: string | null | undefined; type?: string | null | undefined}
>(
  sourceAccountAlias: string,
  targetAccountAlias: string,
  entityName: string,
  entityIdKey: string,
  sourceEntities: Map<string, T>,
  targetEntities: Map<string, T>,
  // Mapping of column name to a callback that will return the printable value for this column
  additionalColumns: {
    [key: string]: (sourceEntity?: T, targetEntity?: T) => Change[];
  },
  showUnchangedChanges = false
): boolean {
  const entitiesByName = new Map<
    string,
    {source?: T; target?: T; changeType?: RowChangeTypeEnum}
  >();
  sourceEntities.forEach((val: T) => {
    entitiesByName.set(val.name as string, {source: val});
  });
  targetEntities.forEach((val: T) => {
    let sourceEntity: T | undefined;
    if (entitiesByName.get(val.name as string)) {
      sourceEntity = entitiesByName.get(val.name as string)?.source;
    }

    entitiesByName.set(val.name as string, {
      source: sourceEntity,
      target: val,
    });
  });

  const outputTable = new Table({
    style: {head: ['blue']},
    head: [
      '?',
      'Name',
      `Source Account \n(${sourceAccountAlias}) \n\n${entityName} ID`,
      `Target Account \n(${targetAccountAlias}) \n\n${entityName} ID`,
      ...Object.keys(additionalColumns),
    ],
  });

  entitiesByName.forEach((val: {source?: T; target?: T}, name: string) => {
    const additionalColumnsDiff: {[key: string]: Change[]} = {};
    Object.keys(additionalColumns).forEach((key: string) => {
      additionalColumnsDiff[key] = additionalColumns[key](
        val?.source,
        val?.target
      );
    });

    const rowChangeType =
      val?.target === undefined
        ? RowChangeTypeEnum.Added
        : val?.source === undefined
        ? RowChangeTypeEnum.Removed
        : Object.values(additionalColumnsDiff).reduce(
            (x, y) => x || y.length > 1,
            false
          )
        ? RowChangeTypeEnum.Modified
        : RowChangeTypeEnum.Unchanged;

    entitiesByName.set(name, {
      ...val,
      changeType: rowChangeType,
    });

    const rowColor = rowChangeType;
    const additionalColumnsCellColor =
      rowChangeType === RowChangeTypeEnum.Modified
        ? RowChangeTypeEnum.Unchanged
        : rowChangeType;

    let targetEntityIdStr =
      val?.target !== undefined
        ? ((val?.target as T as Indexable)[entityIdKey] as string) + '\n\n'
        : '';
    targetEntityIdStr +=
      rowChangeType === RowChangeTypeEnum.Added
        ? '(will be added)'
        : rowChangeType === RowChangeTypeEnum.Removed
        ? '(will be deleted)'
        : rowChangeType === RowChangeTypeEnum.Modified
        ? '(will be modified)'
        : '';
    if (
      showUnchangedChanges === true ||
      rowChangeType !== RowChangeTypeEnum.Unchanged
    ) {
      outputTable.push([
        colors[rowColor](
          rowChangeType === RowChangeTypeEnum.Added
            ? '+'
            : rowChangeType === RowChangeTypeEnum.Removed
            ? '-'
            : rowChangeType === RowChangeTypeEnum.Modified
            ? '+/-'
            : ''
        ),
        colors[rowColor](name),
        // Always grey because we don't change anything in the source account
        colors[RowChangeTypeEnum.Unchanged](
          val?.source !== undefined
            ? ((val?.source as T as Indexable)[entityIdKey] as string)
            : ''
        ),
        colors[rowColor](targetEntityIdStr),
        ...Object.values(additionalColumnsDiff).map(changes => {
          return colors[additionalColumnsCellColor](stringifyDiff(changes));
        }),
      ]);
    }
  });

  const additions = Array.from(entitiesByName.values()).filter(
    row => row.changeType === RowChangeTypeEnum.Added
  ).length;
  const deletions = Array.from(entitiesByName.values()).filter(
    row => row.changeType === RowChangeTypeEnum.Removed
  ).length;
  const modifications = Array.from(entitiesByName.values()).filter(
    row => row.changeType === RowChangeTypeEnum.Modified
  ).length;
  const unchanged = Array.from(entitiesByName.values()).filter(
    row => row.changeType === RowChangeTypeEnum.Unchanged
  ).length;
  const hasChanges = !!(additions || modifications || deletions);

  console.log(
    `==> ${entityName}s`.blue,
    '[',
    `${additions} additions, `.green,
    `${deletions} deletions, `.red,
    `${modifications} modifications, `.yellow,
    `${unchanged} unchanged${!showUnchangedChanges ? ' (hidden)' : ''}`.grey,
    ']'
  );
  if (hasChanges || (showUnchangedChanges && unchanged)) {
    console.log(outputTable.toString());
  }
  if (!hasChanges) {
    console.log(
      `No changes in ${entityName.toLowerCase()}s between the source and target accounts.`
        .grey
    );
  }
  console.log('\n');

  return hasChanges;
}

export {diffCmd};
