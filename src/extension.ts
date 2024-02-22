// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { DocumentHighlight } from "./color-highlight";
import { DecorationOptions } from "./decoration-map";
import { GuidHighlightConfig } from "./config";

const settingsSection: string = "guid-highlight";

let instanceMap: DocumentHighlight[] = [];
let config: GuidHighlightConfig;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  reactivate();

  context.subscriptions.push(
    vscode.commands.registerCommand("guid-highlight.reactivate", () => {
      reactivate();
    })
  );
  vscode.workspace.onDidChangeConfiguration(onConfigurationChange, null, context.subscriptions);
  vscode.window.onDidChangeVisibleTextEditors(onOpenEditor, null, context.subscriptions);
  // vscode.workspace.onDidOpenTextDocument((document) => {
  //   console.log(`workspace.onDidOpenTextDocument: ${document.fileName}`);
  //   // if (isValidDocument(config, document)) {
  //   //   doHighlight([document]);
  //   // }
  // }, null, context.subscriptions);
  // vscode.window.onDidChangeActiveTextEditor((editor) => {
  //   console.log(`window.onDidChangeActiveTextEditor: ${editor?.document.fileName}. Active editor: ${vscode.window.activeTextEditor?.document.fileName}`);
  // }, null, context.subscriptions);
  // vscode.window.onDidChangeVisibleNotebookEditors((editors) => {
  //   console.log(`window.onDidChangeVisibleNotebookEditors: ${editors.map((editor) => editor.notebook.uri).join(", ")}`);
  // }, null, context.subscriptions);
}

// This method is called when your extension is deactivated
export function deactivate() {
  instanceMap.forEach((instance) => instance.dispose());
  instanceMap = [];
}

function reactivate() {
  deactivate();

  config = vscode.workspace.getConfiguration().get<GuidHighlightConfig>(settingsSection)!;

  onOpenEditor(vscode.window.visibleTextEditors);
}

function onOpenEditor(editors: readonly vscode.TextEditor[]) {
  console.log(`onOpenEditor for ${editors.length} editors.`);
  // dispose all inactive editors
  const documents = editors.map(({ document }) => document);
  const forDisposal = instanceMap.filter(({ document }) => documents.indexOf(document) === -1);

  instanceMap = instanceMap.filter(({ document }) => documents.indexOf(document) > -1);
  forDisposal.forEach((instance) => instance.dispose());

  const applicableDocuments = documents.filter((doc) => isValidDocument(config, doc));
  doHighlight(applicableDocuments);
}

async function doHighlight(documents: vscode.TextDocument[] = []) {
  if (documents.length) {
    console.log(`Highlighting documents: ${documents.map((doc) => doc.fileName).join(", ")}`);
    const instances = await Promise.all(documents.map(findOrCreateInstance));

    return instances.filter((instance) => instance !== null).map((instance) => instance!.onUpdate());
  }
}

/**
 *  Checks if the document is applicable for highlighting
 */
function isValidDocument(config: GuidHighlightConfig, document: vscode.TextDocument) {
  let isValid = false;

  if (!config.enable) {
    return isValid;
  }

  if (config.languages.indexOf("*") > -1) {
    isValid = true;
  }

  if (config.languages.indexOf(document.languageId) > -1) {
    isValid = true;
  }
  if (config.languages.indexOf(`!${document.languageId}`) > -1) {
    isValid = false;
  }

  return isValid;
}

/**
 * Finds relevant instance of the DocumentHighlighter or creates a new one
 */
async function findOrCreateInstance(document: vscode.TextDocument): Promise<DocumentHighlight | null> {
  if (!document) {
    return null;
  }

  const found = instanceMap.find(({ document: refDoc }) => refDoc === document);

  if (!found) {
    let decorations = new DecorationOptions(config.markRuler, config.markerType);
    const instance = new DocumentHighlight(document, decorations, config.patterns);
    instanceMap.push(instance);
  }

  return found || instanceMap[instanceMap.length - 1];
}

function onConfigurationChange(e: vscode.ConfigurationChangeEvent) {
  if (e.affectsConfiguration(settingsSection)) {
    console.log("Configuration changed, reactivating...");
    reactivate();
  }
}
