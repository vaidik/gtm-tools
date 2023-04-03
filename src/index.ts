import {Command} from 'commander';
import {copy} from './copy';

const cli = new Command();
cli.addCommand(copy);

async function main() {
  cli.parse(process.argv);
}

main().catch(e => {
  console.error(e);
  throw e;
});
