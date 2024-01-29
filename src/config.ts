import 'reflect-metadata';
import {Type} from 'class-transformer';

import {
  ValidateNested,
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  MinLength,
  Validate,
  ValidationError,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import fs from 'fs';

abstract class AbstractConfig {
  fixTypes() {}
}

class AccountConfig extends AbstractConfig {
  @IsString()
  alias: string;

  @IsString()
  accountId: string;

  @IsString()
  containerId: string;

  @IsString()
  workspaceId: string;

  @IsBoolean()
  @IsOptional()
  isResettable?: boolean;

  @IsOptional()
  @MinLength(1, {each: true})
  variableOverrides: Map<string, string> | undefined;

  constructor(
    alias: string,
    accountId: string,
    containerId: string,
    workspaceId: string
  ) {
    super();
    this.alias = alias;
    this.accountId = accountId;
    this.containerId = containerId;
    this.workspaceId = workspaceId;
  }

  fixTypes(): void {
    if (this.variableOverrides) {
      const obj = new Map<string, string>();
      for (const [key, val] of Object.entries(this.variableOverrides ?? {})) {
        obj.set(key, val);
      }
      this.variableOverrides = obj;
    }
  }
}

@ValidatorConstraint({name: 'customText', async: false})
export class IsValidGoogleAuthKeyFile implements ValidatorConstraintInterface {
  validate(text: string) {
    // test if text ends with .json and the file exists
    return text !== undefined && text.endsWith('.json') && fs.existsSync(text);
  }

  defaultMessage() {
    return 'Value for $property ($value) should be a valid file path ".json" extension and must exist at that path.';
  }
}

class TagManagerAPIConfig extends AbstractConfig {
  @Validate(IsValidGoogleAuthKeyFile) // 6 characters for at least ".json" and a name of the file
  googleAuthKeyFile: string;

  @IsNumber()
  @IsPositive()
  defaultRateLimitBatchSize: number;

  @IsNumber()
  @IsPositive()
  defaultRateLimitBatchDelay: number;

  constructor(
    googleAuthKeyFile: string,
    defaultRateLimitBatchSize = 1, // 1 request per batch
    defaultRateLimitBatchDelay = 5000 // 5 seconds
  ) {
    super();
    this.googleAuthKeyFile = googleAuthKeyFile;
    this.defaultRateLimitBatchSize = defaultRateLimitBatchSize;
    this.defaultRateLimitBatchDelay = defaultRateLimitBatchDelay;
  }
}

export class Config extends AbstractConfig {
  private static instance: Config;

  @ValidateNested()
  @Type(() => TagManagerAPIConfig)
  tagManagerAPI: TagManagerAPIConfig;

  @ValidateNested()
  @Type(() => AccountConfig)
  accounts?: AccountConfig[];

  constructor(tagManagerAPI?: TagManagerAPIConfig, accounts?: AccountConfig[]) {
    super();
    if (tagManagerAPI === undefined) {
      this.tagManagerAPI = new TagManagerAPIConfig('');
    } else {
      this.tagManagerAPI = tagManagerAPI;
    }
    this.accounts = accounts;

    if (Config.instance) {
      return Config.instance;
    }

    Config.instance = this;
  }

  fixTypes() {
    this.accounts?.forEach((account: AccountConfig) => {
      account?.fixTypes();
    });
  }

  getAccount(aliasOrId: string): AccountConfig | undefined {
    const matchedAccounts = this.accounts?.filter(
      account => account.alias === aliasOrId || account.accountId === aliasOrId
    );
    if (matchedAccounts?.length === 0) {
      throw new Error(
        `Could not find an account by alias or ID ${aliasOrId} in the config.`
      );
    }
    return matchedAccounts ? matchedAccounts[0] : undefined;
  }

  formatError(error: ValidationError): string {
    // TODO: this function can be implemented in a better way. This is just a quick hack.
    const delimiter = '\n - ';
    let msg = '';
    msg += error.property + ': ' + '\n';

    if (error.constraints) {
      msg += (' - ' + Object.values(error.constraints).join(delimiter))
        .split('\n')
        .join('\n  ');
    }

    if (error.children && error?.children.length > 0) {
      msg += '';
      error.children?.forEach(child => {
        msg += '  ' + this.formatError(child).split('\n').join('\n  ') + '\n';
      });
    }

    return msg;
  }
}
