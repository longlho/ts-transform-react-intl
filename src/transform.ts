import * as ts from "typescript";
import { MessageDescriptor } from "./types";
import { _ } from "./macro";
import { interpolateName } from "loader-utils";

export type Extractor = (
  msgId: string,
  messages: MessageDescriptor,
  filename?: string
) => void;

export type InterpolateNameFn = (
  sourceFileName: string,
  msg: MessageDescriptor
) => string;

export interface Opts {
  /**
   * Override import name (the `_`) in `import {_} from 'ts-transform-react-intl'`
   *
   * @type {string}
   * @memberof Opts
   */
  macroImportName?: string;
  /**
   * Override module specifier in `import {_} from 'ts-transform-react-intl`
   *
   * @type {string}
   * @memberof Opts
   */
  macroModuleSpecifier?: string;
  /**
   * Callback function that gets called everytime we encountered something
   * that looks like a MessageDescriptor
   *
   * @type {Extractor}
   * @memberof Opts
   */
  onMsgExtracted?: Extractor;
  /**
   * webpack-style name interpolation
   *
   * @type {(InterpolateNameFn | string)}
   * @memberof Opts
   */
  interpolateName?: InterpolateNameFn | string;
  /**
   * Base URL of your project, same as your compiler tsconfig.json
   * This is primarily used to interpolate relative path instead of
   * absolute path all the time, which varies machine to machine
   *
   * @type {string}
   * @memberof Opts
   */
  baseUrl?: string;
}

const DEFAULT_OPTS: Opts = {
  macroImportName: _.name,
  macroModuleSpecifier: require("../package.json").name,
  baseUrl: "",
  onMsgExtracted: () => undefined
};

/**
 * Trim the trailing & beginning ': 'asd' -> asd
 *
 * @param {string} txt text
 * @returns trimmed string
 */
function trimSingleQuote(txt: string): string {
  return txt.replace(/["']/g, "");
}

/**
 * Extract the object literal in TS AST into MessageDescriptor
 *
 * @param {ts.ObjectLiteralExpression} node object literal
 * @returns {Messages}
 */
function extractMessageDescriptor(
  node: ts.ObjectLiteralExpression,
  sf: ts.SourceFile,
  interpolateNameFnOrPattern?: Opts["interpolateName"],
  baseUrl: string = ""
): MessageDescriptor {
  const msg: MessageDescriptor = {
    id: "",
    description: "",
    defaultMessage: ""
  };

  // Go thru each property
  ts.forEachChild(node, (p: ts.PropertyAssignment) => {
    switch (p.name.getText(sf)) {
      case "id":
        const id = trimSingleQuote(p.initializer.getText(sf));
        msg.id = id;
        break;
      case "description":
        msg.description = trimSingleQuote(p.initializer.getText(sf));
        break;
      case "defaultMessage":
        msg.defaultMessage = trimSingleQuote(p.initializer.getText(sf));
        break;
    }
  });

  switch (typeof interpolateNameFnOrPattern) {
    case "string":
      msg.id = interpolateName(
        { sourcePath: sf.fileName.replace(baseUrl, "") } as any,
        interpolateNameFnOrPattern,
        { content: JSON.stringify(msg) }
      );
      break;
    case "function":
      msg.id = interpolateNameFnOrPattern(sf.fileName, msg);
      break;
  }

  return msg;
}

function findMacroHook(
  node: ts.Node,
  sf: ts.SourceFile,
  macroImportName: string,
  macroModuleSpecifier: string
): string {
  let hook = "";
  if (
    ts.isImportDeclaration(node) &&
    trimSingleQuote(node.moduleSpecifier.getText(sf)) === macroModuleSpecifier
  ) {
    const { namedBindings } = node.importClause;
    // Search through named bindings to find our macro
    ts.forEachChild(namedBindings, p => {
      if (!ts.isImportSpecifier(p)) {
        return;
      }
      // This is a alias, like `import {_ as foo}`
      if (p.propertyName) {
        if (p.propertyName.getText(sf) === macroImportName) {
          hook = p.name.getText(sf);
        }
      } else if (p.name.getText(sf) === macroImportName) {
        hook = p.name.getText(sf);
      }
    });
  }
  return hook;
}

function isMacroExpression(
  node: ts.Node,
  sf: ts.SourceFile,
  hook: string
): node is ts.CallExpression & boolean {
  // Make sure it's a function call
  return (
    hook &&
    ts.isCallExpression(node) &&
    // Make sure the fn name matches our hook
    node.expression.getText(sf) === hook &&
    // Make sure we got only 1 arg
    node.arguments.length === 1 &&
    node.arguments[0] &&
    // Make sure it's a object literal
    ts.isObjectLiteralExpression(node.arguments[0])
  );
}

export function transform(opts: Opts) {
  opts = { ...DEFAULT_OPTS, ...opts };
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    function getVisitor(sf: ts.SourceFile) {
      let hook = "";
      const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        if (!hook) {
          hook = findMacroHook(
            node,
            sf,
            opts.macroImportName,
            opts.macroModuleSpecifier
          );
          if (hook) {
            return null;
          }
        }

        // If it's not our macro, skip
        if (!isMacroExpression(node, sf, hook)) {
          return ts.visitEachChild(node, visitor, ctx);
        }
        const msgObjLiteral = node.arguments[0] as ts.ObjectLiteralExpression;

        const msg = extractMessageDescriptor(
          msgObjLiteral,
          sf,
          opts.interpolateName,
          opts.baseUrl
        );

        if (typeof opts.onMsgExtracted === "function") {
          opts.onMsgExtracted(msg.id, msg, sf.fileName);
        }

        return ts.createObjectLiteral([
          ts.createPropertyAssignment("id", ts.createStringLiteral(msg.id)),
          ts.createPropertyAssignment(
            "defaultMessage",
            ts.createStringLiteral(msg.defaultMessage)
          )
        ]);
      };
      return visitor;
    }

    return (sf: ts.SourceFile) => ts.visitNode(sf, getVisitor(sf));
  };
}
