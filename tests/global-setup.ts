import { execSync } from "node:child_process";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/haven_test";

// Applies migrations to the dedicated test database before the suite runs. Integration tests
// create their own rows with unique identifiers and clean up after themselves.
export default function globalSetup() {
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `Could not prepare the test database at ${TEST_DATABASE_URL}.\nStart PostgreSQL (docker compose up -d) and create the database (createdb haven_test).\n\n${output}`,
    );
  }
}
