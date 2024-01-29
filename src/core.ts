import {GaxiosResponse} from 'gaxios';
import {google, tagmanager_v2} from 'googleapis';
import {Option} from 'commander';
import {Config} from './config.js';

class CopyResponse<T> {
  public requestBody: T;
  public response: GaxiosResponse<T> | undefined;
  public error: Error | undefined;

  constructor(requestBody: T) {
    this.requestBody = requestBody;
  }
}

interface response {
  variables: GaxiosResponse[];
  tags: GaxiosResponse[];
  triggers: GaxiosResponse[];
}

export type CopyAccountDataResponse = {
  variables: Map<
    string,
    {
      sourceVariableId: string;
      targetVariableId: string;
      response: CopyResponse<tagmanager_v2.Schema$Variable>;
    }
  >;
  triggers: Map<
    string,
    {
      sourceTriggerId: string;
      targetTriggerId: string;
      response: CopyResponse<tagmanager_v2.Schema$Trigger>;
    }
  >;
  tags: Map<
    string,
    {
      sourceTagId: string;
      targetTagId: string;
      response: CopyResponse<tagmanager_v2.Schema$Tag>;
    }
  >;
};

export class TagManagerData {
  accountId: string;
  containerId: string;
  workspaceId: string;
  variables: Map<string, tagmanager_v2.Schema$Variable>;
  triggers: Map<string, tagmanager_v2.Schema$Trigger>;
  tags: Map<string, tagmanager_v2.Schema$Tag>;
  isResettable: boolean;
  private gtmClient: tagmanager_v2.Tagmanager;
  private parent: string;
  private config: Config = new Config();

  constructor(
    accountId: string,
    containerId: string,
    workspaceId: string,
    isResettable = false
  ) {
    this.accountId = accountId;
    this.containerId = containerId;
    this.workspaceId = workspaceId;
    this.isResettable = isResettable;
    this.variables = new Map<string, tagmanager_v2.Schema$Variable>();
    this.triggers = new Map<string, tagmanager_v2.Schema$Trigger>();
    this.tags = new Map<string, tagmanager_v2.Schema$Tag>();
    this.gtmClient = google.tagmanager('v2');
    this.parent = `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}`;
  }

  async init() {
    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.tagManagerAPI.googleAuthKeyFile,
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.manage.accounts',
        'https://www.googleapis.com/auth/tagmanager.readonly',
      ],
    });

    let authClient;
    try {
      authClient = await auth.getClient();
    } catch (e) {
      console.log(e);
    }
    google.options({auth: authClient});
  }

  async getData() {
    const triggers = (
      await this.gtmClient.accounts.containers.workspaces.triggers.list({
        parent: this.parent,
      })
    ).data.trigger;

    triggers?.forEach(trigger => {
      this.triggers.set(trigger.triggerId as string, {...trigger});
    });

    const variables = (
      await this.gtmClient.accounts.containers.workspaces.variables.list({
        parent: this.parent,
      })
    ).data.variable;

    variables?.forEach(variable => {
      this.variables.set(variable.variableId as string, {...variable});
    });

    const tags = (
      await this.gtmClient.accounts.containers.workspaces.tags.list({
        parent: this.parent,
      })
    ).data.tag;

    tags?.forEach(tag => {
      this.tags.set(tag.tagId as string, {...tag});
    });
  }

  isEmpty(): boolean {
    return !(this.variables.size || this.triggers.size || this.tags.size);
  }

  async copyVariable(
    val: tagmanager_v2.Schema$Variable
  ): Promise<CopyResponse<tagmanager_v2.Schema$Variable>> {
    const requestBody: tagmanager_v2.Schema$Variable = {
      ...val,
    };
    const response: CopyResponse<tagmanager_v2.Schema$Variable> =
      new CopyResponse<tagmanager_v2.Schema$Variable>(requestBody);
    requestBody.workspaceId = this.workspaceId;
    requestBody.accountId = this.accountId;
    requestBody.containerId = this.containerId;
    delete requestBody.variableId;
    delete requestBody.path;
    delete requestBody.fingerprint;
    requestBody.formatValue;

    if (requestBody.type === 'c') {
      const varOverride: string | undefined = this.config
        .getAccount(this.accountId)
        ?.variableOverrides?.get(val.name as string);
      requestBody.parameter?.forEach(val => {
        if (val.key === 'value') {
          val.value = varOverride ?? val.value;
        }
      });
    }

    try {
      const res =
        this.gtmClient.accounts.containers.workspaces.variables.create({
          parent: this.parent,
          requestBody: requestBody,
        });
      response.response = await res;
    } catch (e) {
      response.error = e as Error;
    }

    return response;
  }

  async copyTrigger(
    val: tagmanager_v2.Schema$Trigger
  ): Promise<CopyResponse<tagmanager_v2.Schema$Trigger>> {
    const requestBody: tagmanager_v2.Schema$Trigger = {
      ...val,
    };
    const response: CopyResponse<tagmanager_v2.Schema$Trigger> =
      new CopyResponse<tagmanager_v2.Schema$Trigger>(requestBody);
    requestBody.workspaceId = this.workspaceId;
    requestBody.accountId = this.accountId;
    requestBody.containerId = this.containerId;
    delete requestBody.triggerId;
    delete requestBody.path;
    delete requestBody.fingerprint;

    try {
      const res = this.gtmClient.accounts.containers.workspaces.triggers.create(
        {
          parent: this.parent,
          requestBody: requestBody,
        }
      );
      response.response = await res;
      await res;
    } catch (e) {
      response.error = e as Error;
    }

    return response;
  }

  async copyTag(
    val: tagmanager_v2.Schema$Tag,
    newFiringTriggerId: string[]
  ): Promise<CopyResponse<tagmanager_v2.Schema$Tag>> {
    const requestBody: tagmanager_v2.Schema$Tag = {
      ...val,
    };
    const response: CopyResponse<tagmanager_v2.Schema$Tag> =
      new CopyResponse<tagmanager_v2.Schema$Tag>(requestBody);
    requestBody.workspaceId = this.workspaceId;
    requestBody.accountId = this.accountId;
    requestBody.containerId = this.containerId;
    requestBody.firingTriggerId = newFiringTriggerId;
    delete requestBody.tagId;
    delete requestBody.path;
    delete requestBody.fingerprint;

    try {
      const res = this.gtmClient.accounts.containers.workspaces.tags.create({
        parent: this.parent,
        requestBody: requestBody,
      });
      response.response = await res;
      await res;
    } catch (e) {
      response.error = e as Error;
    }

    return response;
  }

  async copyDataFromAccount(
    sourceAccount: TagManagerData
  ): Promise<CopyAccountDataResponse> {
    const accountDataResponse: CopyAccountDataResponse = {
      variables: new Map<
        string,
        {
          sourceVariableId: string;
          targetVariableId: string;
          response: CopyResponse<tagmanager_v2.Schema$Variable>;
        }
      >(),
      triggers: new Map<
        string,
        {
          sourceTriggerId: string;
          targetTriggerId: string;
          response: CopyResponse<tagmanager_v2.Schema$Trigger>;
        }
      >(),
      tags: new Map<
        string,
        {
          sourceTagId: string;
          targetTagId: string;
          response: CopyResponse<tagmanager_v2.Schema$Tag>;
        }
      >(),
    };

    if (sourceAccount.variables !== undefined) {
      await this.batchPromise(async (val: tagmanager_v2.Schema$Variable) => {
        console.log(
          `==> Copying variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
            .grey
        );
        const response = await this.copyVariable(val);
        this.variables.set(
          response.response?.data?.variableId as string,
          response.response?.data as tagmanager_v2.Schema$Variable
        );
        accountDataResponse.variables.set(val.variableId as string, {
          sourceVariableId: val.variableId as string,
          targetVariableId: response.response?.data?.variableId as string,
          response: response,
        });
      }, Array.from(sourceAccount.variables.values()));
    }

    if (sourceAccount.triggers !== undefined) {
      await this.batchPromise(async (val: tagmanager_v2.Schema$Trigger) => {
        console.log(
          `==> Copying trigger - Trigger ID: ${val.triggerId}, Trigger Name: ${val.name}`
            .grey
        );
        const response = await this.copyTrigger(val);
        this.triggers.set(
          response.response?.data?.triggerId as string,
          response.response?.data as tagmanager_v2.Schema$Trigger
        );
        accountDataResponse.triggers.set(val.triggerId as string, {
          sourceTriggerId: val.triggerId as string,
          targetTriggerId: response.response?.data?.triggerId as string,
          response: response,
        });
      }, Array.from(sourceAccount.triggers.values()));
    }

    if (sourceAccount.tags !== undefined) {
      await this.batchPromise(async (val: tagmanager_v2.Schema$Tag) => {
        console.log(
          `==> Copying tag - Tag ID: ${val.tagId}, Tag Name: ${val.name}`.grey
        );
        const newFiringTriggerId: string[] =
          val?.firingTriggerId !== undefined
            ? (val.firingTriggerId as string[]).map((triggerId: string) => {
                return accountDataResponse.triggers.get(triggerId)
                  ?.targetTriggerId as string;
              })
            : [];
        const response = await this.copyTag(val, newFiringTriggerId);
        this.tags.set(
          response.response?.data?.tagId as string,
          response.response?.data as tagmanager_v2.Schema$Tag
        );
        accountDataResponse.tags.set(val.tagId as string, {
          sourceTagId: val.tagId as string,
          targetTagId: response.response?.data?.tagId as string,
          response: response,
        });
      }, Array.from(sourceAccount.tags.values()));
    }

    return Promise.resolve(accountDataResponse);
  }

  private async batchPromise<F extends (arg: T) => unknown, T>(
    task: F,
    items: T[],
    batchSize: number = this.config.tagManagerAPI.defaultRateLimitBatchSize,
    batchDelay: number = this.config.tagManagerAPI.defaultRateLimitBatchDelay
  ): Promise<unknown[]> {
    let position = 0;
    let results: unknown[] = [];
    while (position < items.length) {
      const itemsForBatch = items.slice(position, position + batchSize);
      results = [
        ...results,
        ...(await Promise.all(itemsForBatch.map(item => task(item)))),
      ];
      position += batchSize;
      await new Promise(r => setTimeout(r, batchDelay));
    }
    return Promise.all(results);
  }

  async reset() {
    if (!this.isResettable)
      throw Error(
        `This GTM account (Account ID: ${this.accountId}) is not resettable.`
      );

    const responses: response = {
      triggers: [] as GaxiosResponse[],
      tags: [] as GaxiosResponse[],
      variables: [] as GaxiosResponse[],
    };

    try {
      const tags = Array.from(this.tags.values());
      const variables = Array.from(this.variables.values());
      const triggers = Array.from(this.triggers.values());

      await this.batchPromise(async (val: tagmanager_v2.Schema$Tag) => {
        console.log(
          `==> Deleting tag - Tag ID: ${val.tagId}, Tag Name: ${val.name}`.grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.tags.delete({
            path: `${this.parent}/tags/${val.tagId}`,
          });
        responses.tags.push(response);
      }, tags);

      await this.batchPromise(async (val: tagmanager_v2.Schema$Trigger) => {
        console.log(
          `==> Deleting trigger - Trigger ID: ${val.triggerId}, Trigger Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.triggers.delete({
            path: `${this.parent}/triggers/${val.triggerId}`,
          });
        responses.triggers.push(response);
      }, triggers);

      // First delete variables of type `jsm` because they could have
      // other variables that depend on them. So the variables that other
      // variables depend on cannot be deleted unless the dependent variables
      // are deleted first.
      await this.batchPromise(
        async (val: tagmanager_v2.Schema$Variable) => {
          console.log(
            `==> Deleting variable - Variable ID (jsm): ${val.variableId}, Variable Name: ${val.name}`
              .grey
          );
          const response =
            await this.gtmClient.accounts.containers.workspaces.variables.delete(
              {
                path: `${this.parent}/variables/${val.variableId}`,
              }
            );
          responses.variables.push(response);
        },
        variables.filter(variable => variable.type === 'jsm')
      );

      await this.batchPromise(
        async (val: tagmanager_v2.Schema$Variable) => {
          console.log(
            `==> Deleting variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
              .grey
          );
          const response =
            await this.gtmClient.accounts.containers.workspaces.variables.delete(
              {
                path: `${this.parent}/variables/${val.variableId}`,
              }
            );
          responses.variables.push(response);
        },
        variables.filter(variable => variable.type !== 'jsm')
      );
    } catch (e) {
      console.log(e);
    }

    return Promise.resolve(responses);
  }
}

export function validateSingleAccountOpts(
  options: {primaryOption: Option; conflictingOptions: Option[]},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any>
) {
  const accountAlias: string = opts.accountAlias;
  const accountId: string = opts.account;
  const containerId: string = opts.container;
  const workspaceId: string = opts.workspace;

  if (!(!!accountAlias || (!!accountId && !!containerId && !!workspaceId))) {
    let errorMsg =
      'one of the following options or group of options must be set:\n';
    errorMsg += `- ${options.primaryOption.flags}\n`;
    errorMsg += `- ${options.conflictingOptions
      .map(op => `'${op.flags}'`)
      .join(', ')}\n`;
    throw new Error(errorMsg);
  }
}
