import * as vscode from 'vscode'; 
import * as proc from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	console.log('stylish-haskell activated'); 
	var channel = vscode.window.createOutputChannel('stylish-haskell');	

	var runOnCurrentCmd = vscode.commands.registerCommand('stylishHaskell.runOnCurrent', () => {
		runStylishHaskell(vscode.window.activeTextEditor.document.fileName, channel);
	});
	context.subscriptions.push(runOnCurrentCmd);
	
	var onSave = vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (isRunOnSaveEnabled()) {
			runStylishHaskell(e.fileName, channel);
		}
	});
		
	context.subscriptions.push(onSave);
}

function runStylishHaskell(fileName: string, channel: vscode.OutputChannel) {
	if (fileName.endsWith(".hs")) {
		channel.clear();

		var cmd = stylishHaskellCmd() + " \"" + fileName + "\"";
		console.log('stylish-haskell extension running: ' + cmd)
		proc.exec(
			cmd,
			(error: Error, stdout: Buffer, stderr: Buffer) => {
				if (error) {
					vscode.window.showErrorMessage("Failed to run stylish-haskell");
				} else {
					// Workaround for https://github.com/Microsoft/vscode/issues/2592
					vscode.workspace.openTextDocument(fileName).then((doc: vscode.TextDocument) => {
						let existingSource = doc.getText();
						let newSource = stdout.toString();
						
						if (existingSource != newSource) {
							let edit = new vscode.WorkspaceEdit();
							edit.replace(doc.uri, new vscode.Range(doc.positionAt(0), doc.positionAt(existingSource.length)), stdout.toString());
							vscode.workspace.applyEdit(edit);
							doc.save();
						}
					});
				}

				if (stderr.length > 0) {				
					channel.appendLine(stderr.toString());
					channel.show(vscode.ViewColumn.Two);
				} else {
					channel.hide();
				}
			}
		);
	}
}

function stylishHaskellCmd() {
	var config = vscode.workspace.getConfiguration("stylishHaskell");
	return config["commandLine"];
}

function isRunOnSaveEnabled() {
	var config = vscode.workspace.getConfiguration("stylishHaskell");
	return config.get("runOnSave", true);
}
