import * as vscode from "vscode";
import { TerminalWrapper,addFunctionCallToMain } from "./exec";
import fs from 'fs';
import path from 'path';
export const EXTENSION_NAME = "Kyopro Runner";
export function activate(context: vscode.ExtensionContext) {
  const provider = new ExecuteViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ExecuteViewProvider.viewType,
      provider,
    ),
  );
  let disposable = vscode.commands.registerCommand('rust-worksheet.runFunction', async (args) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found');
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const wordRange = document.getWordRangeAtPosition(position);
    const functionName = document.getText(wordRange);

    if (!functionName) {
      vscode.window.showErrorMessage('No function selected');
      return;
    }

    const filePath = document.uri.fsPath;
    const fileContent = document.getText();

    // Add the function call to main function
    const updatedContent = addFunctionCallToMain(fileContent, functionName);

    // Write the updated content to a temporary file
    const mainFilePath = path.join(path.dirname(filePath), 'main.rs');
    fs.writeFileSync(mainFilePath, updatedContent);

    // Run the Rust program
    const terminal = vscode.window.createTerminal('Run Rust Function');
    terminal.sendText(`cargo run`);
    terminal.show();
    fs.writeFileSync(mainFilePath, fileContent);
  });
  context.subscriptions.push(disposable);
  const codeActionProvider: vscode.CodeActionProvider = {
    provideCodeActions(document, range, context, token) {
      const wordRange = document.getWordRangeAtPosition(range.start);
      const word = document.getText(wordRange);
      if (word) {
        return [
          {
            title: `Run ${word}`,
            command: 'extension.runFunction',
            arguments: [document.uri, wordRange]
          }
        ];
      }
      return [];
    }
  };

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('rust', codeActionProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.Empty]
    })
  );
}
export function deactivate() {}

class ExecuteViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "rust-worksheet.executeCommand";
  private term = new TerminalWrapper();
  private command: string | undefined = vscode.workspace
    .getConfiguration()
    .get("runtime.command");

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "executeCommand": {
          if (this.command) {
            this.term?.sendTexts([this.command, data.value]);
          }
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js"),
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css"),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link href="${styleMainUri}" rel="stylesheet">
			<title>Input</title>
		</head>
		<body>
			<textarea id="command-input"></textarea>

			<button class="execute-button">Run</button>

			<script nonce="${nonce}" src="${scriptUri}"></script>
		</body>
		</html>`;
  }
}
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
