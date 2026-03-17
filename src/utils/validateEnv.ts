import { ENV } from "src/common/constants/env";
import chalk from "chalk";

export function validateEnv() {
  const missing: string[] = [];

  Object.values(ENV).forEach((key) => {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  });

  if (missing.length) {
    console.log(chalk.red.bold("\n❌ Missing Environment Variables\n"));

    missing.forEach((key) => {
      console.log(chalk.yellow(`👉 ${key}`));
    });

    console.log(
      chalk.cyan(
        "\n📌 Fix:\n- Add the missing variables to your .env file\n- Or pass them via Docker / runtime environment\n"
      )
    );

    console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

    process.exit(1);
  }
}