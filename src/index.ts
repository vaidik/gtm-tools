import path from 'path';
import util from 'util';
import {
  validate
} from 'class-validator';
import { plainToClass } from 'class-transformer';
import {Command} from 'commander';
import {copy_cmd} from './copy.js';
import {list_cmd} from './list.js';
import {Config} from './config.js';
import fs from 'fs';

// Create a CLI command
const cli = new Command();
cli.name('gtm-tools');
cli.option('--config <CONFIG_FILE>', "Path to the config file");

// Register sub-commands
cli.addCommand(list_cmd);
cli.addCommand(copy_cmd);

// Main command
cli.hook('preAction', async (thisCommand, actionCommand) => {
  const configRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), cli.opts().config), {encoding:'utf8', flag:'r'}));
  const configObj = plainToClass(Config, configRaw as Object);

  await validate(configObj, { forbidUnknownValues: false }).then(errors => {
    if (errors.length > 0) {
      console.log('Invalid configuration file. Validation failed.'.red);
      console.log(util.inspect(errors, false, null, true));
      process.exit(1);
    }
  });
});

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('GOOGLE_APPLICATION_CREDENTIALS environment variable must be set and pointing to a valid Google API credentials.json file.'.red)
    process.exit(1);
  }
  await cli.parseAsync();
}

main().catch(e => {
  console.error(e);
  throw e;
});