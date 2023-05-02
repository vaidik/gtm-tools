import {GaxiosResponse, GaxiosPromise} from 'gaxios';
import {google, tagmanager_v2} from 'googleapis';
import {Option} from 'commander';

class CopyResponse<T> {
  public requestBody: T;
  public response: GaxiosPromise<T> | undefined;
  public error: Error | undefined;

  constructor(requestBody: T) {
    this.requestBody = requestBody;
  }
}

interface response {
  variables: GaxiosResponse[],
  tags: GaxiosResponse[],
  triggers: GaxiosResponse[],
}

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
      // Scopes can be specified either as an array or as a single, space-delimited string.
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

    try {
      const res =
        this.gtmClient.accounts.containers.workspaces.variables.create({
          parent: this.parent,
          requestBody: requestBody,
        });
      response.response = res;
      await res;
    } catch (e) {
      response.error = e as Error;
    }

    return response;
  }

  async copyData(
    sourceVariables: Map<string, tagmanager_v2.Schema$Variable> | undefined
  ): Promise<Map<string, CopyResponse<tagmanager_v2.Schema$Variable>>> {
    const responses: Map<
      string,
      CopyResponse<tagmanager_v2.Schema$Variable>
    > = new Map<string, CopyResponse<tagmanager_v2.Schema$Variable>>();

    if (sourceVariables !== undefined) {
      await Promise.all(
        Array.from(sourceVariables.values()).map(async val => {
          console.log(
            `==> Coping variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
              .grey
          );
          const response = await this.copyVariable(val);
          responses.set(val.variableId as string, response);
        })
      );
    }

    return Promise.resolve(responses);
  }

  private async batchPromise(task: any, items: any[], batchSize: number = 3, batchDelay: number = 500): Promise<any[]> {
    let position = 0;
    let results: any[] = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
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
    }

    try {
      const variables = Array.from(this.variables.values());
      console.log(variables.filter(variable => variable.type === 'jsm'));
      variables.filter(variable => variable.type === 'jsm').batchMap(async (val: any) => {
        console.log(
          `==> Deleting variable (jsm) - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.variables.delete({
            path: `${this.parent}/variables/${val.variableId}`,
          });
        responses.variables.push(response);
      }, 5, 500);
      // await batchPromise(variables.filter(variable => variable.type === 'jsm'))(async (val: any) => {
      //     console.log(
      //       `==> Deleting variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
      //         .grey
      //     );
      //     const response =
      //       await this.gtmClient.accounts.containers.workspaces.variables.delete({
      //         path: `${this.parent}/variables/${val.variableId}`,
      //       });
      //     responses.variables.push(response);
      //   });

      await this.batchPromise(async (val: any) => {
        console.log(
          `==> Deleting variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.variables.delete({
            path: `${this.parent}/variables/${val.variableId}`,
          });
        responses.variables.push(response);
      }, variables.filter(variable => variable.type !== 'jsm'), 5);
    } catch (e) {
      console.log(e);
    }

    await Promise.all(
      Array.from(this.tags.values()).map(async val => {
        console.log(
          `==> Deleting tag - Tag ID: ${val.tagId}, Tag Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.tags.delete({
            path: `${this.parent}/tags/${val.tagId}`,
          });
        responses.tags.push(response);
      })
    );

    await Promise.all(
      Array.from(this.triggers.values()).map(async val => {
        console.log(
          `==> Deleting trigger - Trigger ID: ${val.triggerId}, Trigger Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.triggers.delete({
            path: `${this.parent}/triggers/${val.triggerId}`,
          });
        responses.triggers.push(response);
      })
    );

    return Promise.resolve(responses);
  }
}

declare global { 
  interface Array<T> {
    batchMap(
      task: (item: T) => any,
      batchSize: number,
      delay: number
    ): Promise<Array<T>>;
  }
}

Array.prototype.batchMap = async function (task: (item: any) => any, batchSize: number = 5, delay: number = 0) {
  let results: any[] = [];
  let position = 0;
  while (position < this.length) {
    const itemsForBatch = Array.from(this.values()).slice(position, position + batchSize);
    results = [...results, ...await Promise.all(itemsForBatch.map((item: any) => task(item)))];
    position += batchSize;
    console.log('waiting', delay);
    await new Promise(r => setTimeout(r, delay));
    console.log('waited', delay);
  }
  return Promise.resolve(results);
}

function batchPromise(items: any[], batchSize: number = 5, batchDelay: number = 500): any {
  return async (task: any): Promise<any> => {
    let position = 0;
    let results: any[] = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
        position += batchSize;
        await new Promise(r => setTimeout(r, batchDelay));
    }
    return Promise.all(results);
  };
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
