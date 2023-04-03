import {google, tagmanager_v2} from 'googleapis';

interface GTMEntity {
  name: string;
  type: string;
}

interface GTMTag extends GTMEntity {
  firingTriggerId: string[];
}

export {GTMEntity, GTMTag};
