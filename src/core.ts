import {GaxiosResponse, GaxiosPromise} from 'gaxios';
import {google, tagmanager_v2} from 'googleapis';

class CopyResponse<T> {
  public requestBody: T;
  public response: GaxiosPromise<T> | undefined;
  public error: Error | undefined;

  constructor(requestBody: T) {
    this.requestBody = requestBody;
  }
}

class TagManagerData {
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
      response.error = e;
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
            `====> Coping variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
              .grey
          );
          const response = await this.copyVariable(val);
          responses.set(val.variableId as string, response);
        })
      );
    }

    return Promise.resolve(responses);
  }

  async reset() {
    if (!this.isResettable)
      throw Error(
        `This GTM account (Account ID: ${this.accountId}) is not resettable.`
      );
    const responses: GaxiosResponse[] = [];
    console.log('resetting', this.variables.size);
    await Promise.all(
      Array.from(this.variables.values()).map(async val => {
        console.log(
          `====> Deleting variable - Variable ID: ${val.variableId}, Variable Name: ${val.name}`
            .grey
        );
        const response =
          await this.gtmClient.accounts.containers.workspaces.variables.delete({
            path: `${this.parent}/variables/${val.variableId}`,
          });
        console.log(response);
        responses.push(response);
      })
    );

    return Promise.resolve(responses);
  }
}

export {TagManagerData};
