// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { DocumentHighlight } from "./color-highlight";
import { DecorationOptions } from "./decoration-map";

let instanceMap: DocumentHighlight[] = [];
let config: vscode.WorkspaceConfiguration;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  instanceMap = [];
  config = vscode.workspace.getConfiguration("guid-highlight");

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "guid-highlight" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "guid-highlight.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from GUID highlight!");
    }
  );

  context.subscriptions.push(disposable);

  vscode.window.onDidChangeVisibleTextEditors(
    onOpenEditor,
    null,
    context.subscriptions
  );
  onOpenEditor(vscode.window.visibleTextEditors);
}

// This method is called when your extension is deactivated
export function deactivate() {
	instanceMap.forEach((instance) => instance.dispose());
	instanceMap = [];
}

function reactivate() {
	deactivate();
  
	instanceMap = [];
	onOpenEditor(vscode.window.visibleTextEditors);
}

function onOpenEditor(editors: readonly vscode.TextEditor[]) {
	console.log(`onOpenEditor for ${editors.length} editors.`);
	  // dispose all inactive editors
	  const documents = editors.map(({ document }) => document);
	  const forDisposal = instanceMap.filter(({ document }) => documents.indexOf(document) === -1);
	
	  instanceMap = instanceMap.filter(({ document }) => documents.indexOf(document) > -1);
	  forDisposal.forEach(instance => instance.dispose());
	
	  // enable highlight in active editors
	  const validDocuments = documents.filter(doc => isValidDocument(config, doc));
	
	  doHighlight(validDocuments);
}

async function doHighlight(documents : vscode.TextDocument[] = []) {
  if (documents.length) {
    const instances = await Promise.all(documents.map(findOrCreateInstance));

    return instances.filter((instance) => instance !== null).map((instance) => instance!.onUpdate());
  }
}

/**
 *  Checks if the document is applicable for autoHighlighighting
 *
 * @param {{languages: string[]}} config
 * @param {vscode.TextDocument} document
 * @returns
 */
function isValidDocument(config : any, document : vscode.TextDocument) {
	// todo
	return true;
	let isValid = false;
  
	if (!config.enable) {
	  return isValid;
	}
  
	if (config.languages.indexOf('*') > -1) {
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
 *
 * @param {vscode.TextDocument} document
 * @returns {DocumentHighlight}
 */
async function findOrCreateInstance(document: vscode.TextDocument): Promise<DocumentHighlight | null> {
  if (!document) {
    return null;
  }

  const found = instanceMap.find(({ document: refDoc }) => refDoc === document);

  if (!found) {
    let docConfig = new DecorationOptions(
      false, "background"
      // config.get("markRuler")!,
      // config.get("markerType")!
    );
    const instance = new DocumentHighlight(document, docConfig);
    instanceMap.push(instance);
  }

  return found || instanceMap[instanceMap.length - 1];
}