import {Command} from 'commander';
import {copy} from './copy';
import {list} from './list';

const cli = new Command();
cli.addCommand(list);
cli.addCommand(copy);

async function main() {
  cli.parse(process.argv);
}

main().catch(e => {
  console.error(e);
  throw e;
});
