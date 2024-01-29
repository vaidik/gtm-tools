import path from 'path';
import {validate} from 'class-validator';
import {plainToClass} from 'class-transformer';
import {Command} from 'commander';
import {copy_cmd} from './copy.js';
import {diffCmd} from './diff.js';
import {list_cmd} from './list.js';
import {reset_cmd} from './reset.js';
import {Config} from './config.js';
import fs from 'fs';

// Create a CLI command
const cli = new Command();
cli.name('gtm-tools');
cli.option('--config <CONFIG_FILE>', 'Path to the config file');

// Register sub-commands
cli.addCommand(list_cmd);
cli.addCommand(diffCmd);
cli.addCommand(copy_cmd);
cli.addCommand(reset_cmd);

// Main command
cli.hook('preAction', async () => {
  const configRaw = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), cli.opts().config), {
      encoding: 'utf8',
      flag: 'r',
    })
  );
  const configObj = plainToClass(Config, configRaw as Object);
  configObj.fixTypes();

  await validate(configObj, {forbidUnknownValues: false}).then(errors => {
    if (errors.length > 0) {
      cli.error(
        (
          'Invalid configuration file. Validation failed.' +
          '\n\n' +
          configObj.formatError(errors[0])
        ).red
      );
    }
  });
});

async function main() {
  await cli.parseAsync();
}

main().catch(e => {
  console.error(e);
  throw e;
});
