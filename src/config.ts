import 'reflect-metadata';
import {Type} from 'class-transformer';

import {
  ValidateNested,
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
} from 'class-validator';

class AccountConfig {
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

  constructor(
    alias: string,
    accountId: string,
    containerId: string,
    workspaceId: string
  ) {
    this.alias = alias;
    this.accountId = accountId;
    this.containerId = containerId;
    this.workspaceId = workspaceId;
  }
}

class TagManagerAPIConfig {
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
    this.defaultRateLimitBatchSize = defaultRateLimitBatchSize;
    this.defaultRateLimitBatchDelay = defaultRateLimitBatchDelay;
  }
}

export class Config {
  private static instance: Config;

  @ValidateNested()
  @Type(() => TagManagerAPIConfig)
  tagManagerAPI: TagManagerAPIConfig;

  @ValidateNested()
  @Type(() => AccountConfig)
  accounts?: AccountConfig[];

  constructor(tagManagerAPI?: TagManagerAPIConfig, accounts?: AccountConfig[]) {
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

  getAccount(alias: string): AccountConfig | undefined {
    const matchedAccounts = this.accounts?.filter(
      account => account.alias === alias
    );
    if (matchedAccounts?.length === 0) {
      throw new Error(
        `Could not find an account by the alias ${alias} in the config.`
      );
    }
    return matchedAccounts ? matchedAccounts[0] : undefined;
  }
}
