import {Command} from 'commander';
import {copy_cmd} from './copy';
import {list_cmd} from './list';

const cli = new Command();
cli.addCommand(list_cmd);
cli.addCommand(copy_cmd);

async function main() {
  cli.parse(process.argv);
}

main().catch(e => {
  console.error(e);
  throw e;
});
