#!/usr/bin/env node

import * as path from "path";
import * as ts from "typescript";
import * as tsconfig from "../tsconfig.json";
const { compilerOptions } = tsconfig;
import arg from "arg";
import recursive from "recursive-readdir";

main();

function main() {
  const args = arg({
    "--out": String,
    "--path": String
  });
  const srcpath = args["--path"];
  if (!srcpath || srcpath === "") {
    console.log("path is required");
    return;
  }

  const rootPath = path.resolve(process.cwd(), srcpath);

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
      createProgram(files, compilerOptions as any)
        .getSourceFiles()
        .filter(s => {
          return (
            !s.fileName.includes("node_modules") && s.fileName.endsWith(".ts")
          );
        })
        .forEach(s => {
          console.log(s.fileName);
          const printer = ts.createPrinter();
          console.log(printer.printFile(s));
        });
    }
  );
}

function createProgram(
  fileNames: string[],
  options: ts.CompilerOptions
): ts.Program {
  const host = ts.createCompilerHost({
    noEmit: true,
    noEmitOnError: false,
    target: ts.ScriptTarget.ES5
  });
  const orgGetSourceFile = host.getSourceFile;
  host.getSourceFile = (
    fileName: string,
    scriptTarget: ts.ScriptTarget,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean
  ): ts.SourceFile => {
    const src = orgGetSourceFile(
      fileName,
      scriptTarget,
      onError,
      shouldCreateNewSourceFile
    );
    const result = ts.transform(src, [removeImport, removeAssertExpression]);
    result.dispose();
    return result.transformed[0] as ts.SourceFile;
  };

  return ts.createProgram(fileNames, options, host);
}

const removeImport = <T extends ts.Node>(context: ts.TransformationContext) => (
  rootNode: T
) => {
  function visit(node: ts.Node): ts.Node {
    node = ts.visitEachChild(node, visit, context);
    if (!ts.isImportDeclaration(node)) {
      return node;
    }
    const importDecl: ts.ImportDeclaration = node;
    if ((importDecl.moduleSpecifier as any).text === "assert") {
      return null;
    }

    return node;
  }
  return ts.visitNode(rootNode, visit);
};
const removeAssertExpression = <T extends ts.Node>(
  context: ts.TransformationContext
) => (rootNode: T) => {
  function visit(node: ts.Node): ts.Node {
    node = ts.visitEachChild(node, visit, context);
    if (!ts.isExpressionStatement(node)) {
      return node;
    }
    if (!ts.isCallExpression(node.expression)) {
      return node;
    }
    const call: ts.CallExpression = node.expression;
    if ((call.expression as any).escapedTxt === "assert") {
      return null;
    }
    if (!ts.isPropertyAccessExpression(call.expression)) {
      return node;
    }
    const propAccess: ts.PropertyAccessExpression = call.expression;

    if ((propAccess.expression as any).escapedText === "assert") {
      return null;
    }

    return node;
  }
  return ts.visitNode(rootNode, visit);
};
