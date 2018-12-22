import arg from "arg";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

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
    if ((call.expression as any).escapedText === "assert") {
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

const swapImport = <T extends ts.Node>(context: ts.TransformationContext) => (
  rootNode: T
) => {
  function visit(node: ts.Node): ts.Node {
    node = ts.visitEachChild(node, visit, context);
    if (!ts.isImportDeclaration(node)) {
      return node;
    }
    const importDecl: ts.ImportDeclaration = node;
    if ((importDecl.moduleSpecifier as any).text === "assert") {
      (importDecl.moduleSpecifier as any).text = "power-assert";
      return node;
    }

    return node;
  }
  return ts.visitNode(rootNode, visit);
};

const args = arg({
  "--path": String
});
const srcpath = args["--path"];
if (!srcpath || srcpath === "") {
  console.log("path is required");
  process.exit(1);
}

const src = fs.readFileSync(path.resolve(process.cwd(), srcpath), {
  encoding: "utf-8"
});

const sourceFile = ts.createSourceFile("", src, ts.ScriptTarget.ES2015);

const result = ts.transform(sourceFile, [removeImport, removeAssertExpression]);
result.dispose();

const printer = ts.createPrinter();
console.log(printer.printFile(result.transformed[0] as ts.SourceFile));
