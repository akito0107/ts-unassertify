#!/usr/bin/env node

import commander from "commander";
import * as path from "path";
import * as pack from "../package.json";
const { version } = pack as any;
import recursive from "recursive-readdir";
import * as ts from "typescript";
import * as tsconfig from "../tsconfig.json";
const { compilerOptions } = tsconfig;

main();

function main() {
  const program = new commander.Command();
  program
    .version(version)
    .option("-p, --path", "root dir path", process.cwd())
    .option("-o, --out", "output dir path", path.resolve(process.cwd(), "out"))
    .parse(process.argv);

  const rootPath = path.resolve(process.cwd(), program.path);

  recursive(
    rootPath,
    [
      (file, stats) => {
        if (stats.isDirectory()) {
          return true;
        }
        return path.extname(file) !== ".ts" && path.extname(file) !== ".tsx";
      }
    ],
    (err, files) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      compilerOptions.outDir = "../lib2";
      compile(files, compilerOptions as any);
    }
  );
}

function compile(fileNames: string[], options: ts.CompilerOptions): void {
  const pg = ts.createProgram(fileNames, options);
  const emitResult = pg.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(pg)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
      );
    }
  });

  const exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}
