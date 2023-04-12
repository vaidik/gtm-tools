import {Command} from 'commander';
import {copy_cmd} from './copy';
import {list_cmd} from './list';

const cli = new Command();
cli.addCommand(list_cmd);
cli.addCommand(copy_cmd);

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('GOOGLE_APPLICATION_CREDENTIALS environment variable must be set and pointing to a valid Google API credentials.json file.'.red)
    process.exit(1);
  }
  cli.parse(process.argv);
}

main().catch(e => {
  console.error(e);
  throw e;
});
