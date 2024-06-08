import * as vscode from "vscode";
import { EXTENSION_NAME } from "./extension";
export function executeCommand(input: string) {
  const term = openTerminal();
  const s: string | undefined = vscode.workspace
    .getConfiguration()
    .get("runtime.command");
  term?.show();
  if (s) {
    term?.sendText(s);
  }

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
    (term) => term.name === EXTENSION_NAME 
  );
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: EXTENSION_NAME,
      cwd: workspacePath,
    });
  }
  return terminal;
}

