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
} from 'class-validator';

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

class TagManagerAPIConfig extends AbstractConfig {
  @IsNumber()
  @IsPositive()
  defaultRateLimitBatchSize: number;

  @IsNumber()
  @IsPositive()
  defaultRateLimitBatchDelay: number;

  constructor(
    defaultRateLimitBatchSize = 5, // 15 requests per minute
    defaultRateLimitBatchDelay = 15000 // 15 seconds
  ) {
    super();
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
      this.tagManagerAPI = new TagManagerAPIConfig();
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
}
