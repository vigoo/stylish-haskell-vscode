import * as vscode from 'vscode'; 
import * as proc from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	console.log('stylish-haskell activated'); 

	var disposable = vscode.commands.registerCommand('stylishHaskell.runOnCurrent', () => {
		proc.exec(
			"stylish-haskell -i " + vscode.window.activeTextEditor.document.fileName,
			(error: Error, stdout: Buffer, stderr: Buffer) => {
				if (error) {
					vscode.window.showErrorMessage("Failed to run stylish-haskell");
				}
			}
		);
	});
	
	context.subscriptions.push(disposable);
}