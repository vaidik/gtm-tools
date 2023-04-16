import 'reflect-metadata';
import { plainToClass, Type } from 'class-transformer';


import {
  validate,
  validateOrReject,
  ValidateNested,
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsBoolean,
  IsString,
  IsOptional,
  IsFQDN,
  IsDate,
  Min,
  Max,
} from 'class-validator';

import util from 'util';

class AccountConfig {
  @IsString()
  alias: string

  @IsString()
  accountId: string

  @IsString()
  containerId: string

  @IsString()
  workspaceId: string

  @IsBoolean()
  @IsOptional()
  isResettable?: boolean

  constructor(alias: string, accountId: string, containerId: string, workspaceId: string) {
    this.alias = alias;
    this.accountId = accountId;
    this.containerId = containerId;
    this.workspaceId = workspaceId;
  }
}

export class Config {
  private static instance: Config;

  @ValidateNested()
  @Type(() => AccountConfig)
  accounts?: AccountConfig[]

  constructor(accounts?: AccountConfig[]) {
    if (Config.instance) {
      return Config.instance;
    }

    this.accounts = accounts;
    Config.instance = this;
  }

  getAccount(alias: string): AccountConfig | undefined {
    const matchedAccounts = this.accounts?.filter(account => account.alias === alias);
    if (matchedAccounts?.length == 0) {
      throw new Error(`Could not find an account by the alias ${alias} in the config.`)
    }
    return matchedAccounts ? matchedAccounts[0] : undefined;
  }
}