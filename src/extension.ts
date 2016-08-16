import * as vscode from 'vscode'; 
import * as proc from 'child_process';
import * as path from 'path';

import StylishHaskellProvider from './features/StylishHaskellProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('stylish-haskell activated'); 

	var provider = new StylishHaskellProvider();
	provider.activate(context.subscriptions);

	var channel = vscode.window.createOutputChannel('stylish-haskell');	

	var runOnCurrentCmd = vscode.commands.registerCommand('stylishHaskell.runOnCurrent', () => {
		var doc = vscode.window.activeTextEditor.document;
		runStylishHaskell(doc.fileName, doc.uri, channel, provider);
	});
	context.subscriptions.push(runOnCurrentCmd);
	
	var onSave = vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (isRunOnSaveEnabled()) {
			runStylishHaskell(e.fileName, e.uri, channel, provider);
		}
	});
		
	context.subscriptions.push(onSave);
}

function runStylishHaskell(fileName: string, uri: vscode.Uri, channel: vscode.OutputChannel, provider: StylishHaskellProvider) {
	if (fileName.endsWith(".hs")) {
		channel.clear();

		var cmd = stylishHaskellCmd() + " \"" + fileName + "\"";
		var dir = path.dirname(fileName);
		var options = {
			encoding: 'utf8',
			timeout: 0,
			maxBuffer: 200*1024,
			killSignal: 'SIGTERM',
			cwd: dir,
			env: null
		};

		console.log('stylish-haskell extension running: ' + cmd + ' in directory ' + dir)
		proc.exec(
			cmd,
			options,
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
					if (isShowConsoleOnErrorEnabled()) {				
						channel.appendLine(stderr.toString());
						channel.show(vscode.ViewColumn.Two);
					}

					provider.processOutput(uri, stderr.toString());
				} else {
					channel.hide();
					provider.reset();
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

function isShowConsoleOnErrorEnabled() {
	var config = vscode.workspace.getConfiguration("stylishHaskell");
	return config.get("showConsoleOnError", true);
}
