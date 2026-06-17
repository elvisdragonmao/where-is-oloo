import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const outputPath = resolve(process.argv[2] ?? `exports/dumps/oloo-${timestamp}.dump`);
const containerName = process.env.DB_CONTAINER;
const dockerArgs = containerName ? ["exec", containerName, "pg_dump", "-U", "oloo", "-d", "oloo", "-Fc"] : ["compose", "exec", "-T", "db", "pg_dump", "-U", "oloo", "-d", "oloo", "-Fc"];

mkdirSync(dirname(outputPath), { recursive: true });

const output = createWriteStream(outputPath);
const child = spawn("docker", dockerArgs, {
	stdio: ["ignore", "pipe", "inherit"]
});

child.stdout.pipe(output);

const removePartialDump = () => {
	output.close();
	rmSync(outputPath, { force: true });
};

child.on("error", error => {
	removePartialDump();
	console.error(`Failed to run docker: ${error.message}`);
	process.exitCode = 1;
});

child.on("close", code => {
	output.close();

	if (code !== 0) {
		rmSync(outputPath, { force: true });
		console.error(`pg_dump failed with exit code ${code}`);
		process.exitCode = code ?? 1;
		return;
	}

	console.log(`Wrote ${outputPath}`);
});
