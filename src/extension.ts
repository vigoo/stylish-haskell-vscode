import * as vscode from 'vscode'; 
import * as proc from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	console.log('stylish-haskell activated'); 

	var disposable = vscode.commands.registerCommand('stylishHaskell.runOnCurrent', () => {
		proc.exec(
			stylishHaskellCmd() + " -i " + vscode.window.activeTextEditor.document.fileName,
			(error: Error, stdout: Buffer, stderr: Buffer) => {
				if (error) {
					vscode.window.showErrorMessage("Failed to run stylish-haskell");
				}
				
				if (stderr.length > 0) {
					var channel = vscode.window.createOutputChannel('stylish-haskell');
					channel.clear();
					channel.appendLine(stderr.toString());
					channel.show(vscode.ViewColumn.Two);
				}
			}
		);
	});
	
	context.subscriptions.push(disposable);
}

function stylishHaskellCmd() {
    var config = vscode.workspace.getConfiguration("stylishHaskell");
    return config["commandLine"];
}