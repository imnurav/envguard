import chalk from "chalk";

function line(char = "─", width = 56) {
  return char.repeat(width);
}

function printBlock(title, bodyLines = [], color = chalk.cyan) {
  console.log(color(line()));
  console.log(color.bold(` ${title}`));

  bodyLines.forEach((entry) => {
    console.log(entry);
  });

  console.log(color(line()));
}

function printKeyValue(key, value) {
  console.log(`  ${chalk.gray(key.padEnd(14))} ${value}`);
}

function printList(items, color = chalk.white) {
  items.forEach((item) => {
    console.log(`  ${color("•")} ${item}`);
  });
}

export const logger = {
  success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
  error: (msg) => console.log(chalk.red(`✖ ${msg}`)),
  info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
  heading: (title, subtitle) =>
    printBlock(title, subtitle ? [chalk.gray(` ${subtitle}`)] : [], chalk.cyan),
  section: (title) => console.log(chalk.cyan.bold(`\n${title}`)),
  fileHeader: (fileName, meta) => {
    const details = meta ? chalk.gray(`  ${meta}`) : "";
    console.log(chalk.magenta.bold(`\n◆ ${fileName}${details}`));
  },
  keyValue: printKeyValue,
  list: printList,
  empty: (msg) => console.log(chalk.gray(`  ${msg}`)),
};
