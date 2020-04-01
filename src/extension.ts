import * as vscode from "vscode";
import * as proc from "child_process";
import * as path from "path";

import StylishHaskellProvider from "./features/stylishHaskellProvider";

export class HaskellDocumentFormattingEditProvider 
	implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
	private config: vscode.WorkspaceConfiguration;
	private commandLine: string;
	private isShowConsoleOnErrorEnabled: boolean;
	private provider: StylishHaskellProvider;
	private channel: vscode.OutputChannel;

	private handleSuccess = (edits: vscode.TextEdit[]) => {
		this.provider.reset();
		this.channel.clear();
		return edits;
	}

	private handleError = (document: vscode.TextDocument) => (err: string) => {
		if (!err) {
			vscode.window.showErrorMessage("Failed to run stylish-haskell");
		} else if (err.length > 0) {
			if (this.isShowConsoleOnErrorEnabled) {
				this.channel.appendLine(err);
				this.channel.show(vscode.ViewColumn.Two);
			}

			this.provider.processOutput(document.uri, err);
		} else {
			this.channel.hide();
			this.provider.reset();
		}
	}

	constructor(
		provider: StylishHaskellProvider,
		channel: vscode.OutputChannel
	) {
		this.config = vscode.workspace.getConfiguration("stylishHaskell");

		this.commandLine = this.config["commandLine"];
		this.isShowConsoleOnErrorEnabled = this.config.get("showConsoleOnError", true);

		this.provider = provider;
		this.channel = channel;
	}

	public provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.ProviderResult<vscode.TextEdit[]> {
		return this.format(document).then(
			this.handleSuccess,
			this.handleError(document)
		);
	}

	public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range): vscode.ProviderResult<vscode.TextEdit[]> {
		return this.format(document, range).then(
			this.handleSuccess,
			this.handleError(document)
		);
	}

	private format(document: vscode.TextDocument, range?: vscode.Range): Thenable<vscode.TextEdit[]> {
		const cmd = this.commandLine;
		const workspace = vscode.workspace.workspaceFolders[0];
		const dir = workspace ? workspace.uri.fsPath : path.dirname(document.fileName);
		const options = {
			encoding: "utf8",
			timeout: 0,
			maxBuffer: 200 * 1024,
			killSignal: "SIGTERM",
			cwd: dir,
			env: null
		};
	
		return new Promise<vscode.TextEdit[]>((resolve, reject) => {
			let stdout: Array<string> = [];
			let stderr: Array<string> = [];
	
			const p = proc.spawn(cmd, [], options);
			p.stdout.setEncoding("utf8");
			p.stdout.on("data", data => stdout.push(data.toString()));
			p.stderr.on("data", data => stderr.push(data.toString()));
			p.on("error", err => reject(err.toString()));
			p.on("close", code => {
				if (code !== 0) {
					return reject(stderr.join(""));
				}
	
				const fileStart = new vscode.Position(0, 0);
				const fileEnd = document.lineAt(document.lineCount - 1).range.end;
				const fileRange = range || new vscode.Range(fileStart, fileEnd);
				const textEdits = [
					new vscode.TextEdit(
						fileRange,
						stdout.join("")
					)
				];
	
				return resolve(textEdits);
			});
			p.stdin.end(document.getText(range));
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("stylish-haskell activated");

	const diagnostic = new StylishHaskellProvider();
	diagnostic.activate(context.subscriptions);

	const channel = vscode.window.createOutputChannel("stylish-haskell");
	const provider = new HaskellDocumentFormattingEditProvider(diagnostic, channel);

	const selector: vscode.DocumentSelector = [
		{ language: "haskell", scheme: "file" },
		{ language: "haskell", scheme: "untitled"}
	];
	const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
		selector,
		provider
	);
	context.subscriptions.push(formattingProvider);

	const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
		selector,
		provider
	);
	context.subscriptions.push(rangeFormattingProvider);

	const runOnCommand = vscode.commands.registerTextEditorCommand("stylishHaskell.runOnCurrent", editor => {
		if (editor.document.languageId === "haskell") {
			vscode.commands.executeCommand("editor.action.formatDocument");
		}
	});
	context.subscriptions.push(runOnCommand);
}
