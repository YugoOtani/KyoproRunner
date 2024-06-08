import * as vscode from "vscode";
import { TerminalWrapper } from "./exec";
export const EXTENSION_NAME = "Kyopro Runner";
export function activate(context: vscode.ExtensionContext) {
  const provider = new ExecuteViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ExecuteViewProvider.viewType,
      provider,
    ),
  );
}
export function deactivate() {}

class ExecuteViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "rust-worksheet.executeCommand";
  private term = TerminalWrapper.create();
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
            this.term?.sendText(this.command);
            this.term?.sendText(data.value);
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
