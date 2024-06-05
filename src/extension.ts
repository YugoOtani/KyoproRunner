import * as vscode from "vscode";
const EXTENSION_NAME = "Kyopro Runner";
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
          executeCommand(data.value);
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
function executeCommand(input: string) {
  const term = openTerminal();
  term?.show();
  term?.sendText(input);
}
function openTerminal() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return null;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  let terminal = vscode.window.terminals.find(
    (term) => term.name === EXTENSION_NAME && !term.state.isInteractedWith,
  );
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: EXTENSION_NAME,
      cwd: workspacePath,
    });
  }
  return terminal;
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
