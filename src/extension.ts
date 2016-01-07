import * as vscode from 'vscode'; 
import * as proc from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	console.log('stylish-haskell activated'); 

	var runOnCurrentCmd = vscode.commands.registerCommand('stylishHaskell.runOnCurrent', () => {
		const doc = vscode.window.activeTextEditor.document;
        if (isTargetDocument(doc)) {
            runStylishHaskell(doc.fileName);   
        } else {
            vscode.window.showErrorMessage("This is not haskell document");
        }
	});
	context.subscriptions.push(runOnCurrentCmd);
	
	
	var onSave = vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (isTargetDocument(e) && isRunOnSaveEnabled()) {
			runStylishHaskell(e.fileName);
		}
	});
		
	context.subscriptions.push(onSave);	
}

function runStylishHaskell(fileName: string) {
	var channel = vscode.window.createOutputChannel('stylish-haskell');
	channel.clear();

	proc.exec(
		stylishHaskellCmd() + " -i \"" + fileName + "\"",
		(error: Error, stdout: Buffer, stderr: Buffer) => {
			if (error) {
				vscode.window.showErrorMessage("Failed to run stylish-haskell");
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

function stylishHaskellCmd() {
    var config = vscode.workspace.getConfiguration("stylishHaskell");
    return config["commandLine"];
}

function isRunOnSaveEnabled() {
	var config = vscode.workspace.getConfiguration("stylishHaskell");
	return config.get("runOnSave", true);
}

function isTargetDocument(doc: vscode.TextDocument) {
    return doc.languageId == "haskell";
}