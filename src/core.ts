import {google, tagmanager_v2} from 'googleapis';
import {GTMEntity, GTMTag} from './types';

class TagManagerData {
  accountId: string;
  containerId: string;
  variables: Map<string, GTMEntity>;
  triggers: Map<string, GTMEntity>;
  tags: Map<string, GTMTag>;
  private gtm_client: tagmanager_v2.Tagmanager;
  private parent: string;

  constructor(accountId: string, containerId: string) {
    this.accountId = accountId;
    this.containerId = containerId;
    this.variables = new Map<string, GTMEntity>();
    this.triggers = new Map<string, GTMEntity>();
    this.tags = new Map<string, GTMTag>();
    this.gtm_client = google.tagmanager('v2');
    this.parent = `accounts/${this.accountId}/containers/${this.containerId}/workspaces/3`;
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
      await this.gtm_client.accounts.containers.workspaces.triggers.list({
        parent: this.parent,
      })
    ).data.trigger;

    triggers?.forEach(trigger => {
      this.triggers.set(trigger.triggerId as string, {...trigger} as GTMEntity);
    });

    const variables = (
      await this.gtm_client.accounts.containers.workspaces.variables.list({
        parent: this.parent,
      })
    ).data.variable;

    variables?.forEach(variable => {
      this.variables.set(
        variable.variableId as string,
        {...variable} as GTMEntity
      );
    });

    const tags = (
      await this.gtm_client.accounts.containers.workspaces.tags.list({
        parent: this.parent,
      })
    ).data.tag;

    tags?.forEach(tag => {
      this.tags.set(tag.tagId as string, {...tag} as GTMTag);
    });
  }
}

export {TagManagerData};
