import AppKit
import Foundation
import SwiftUI

struct ToolAction: Identifiable, Hashable {
    let id: String
    let title: String
    let detail: String
    let launchPath: String
    let arguments: [String]
}

@MainActor
final class AppModel: ObservableObject {
    @Published var selectedActionID: String?
    @Published var output = "Select a check, then run it.\n"
    @Published var isRunning = false
    @Published var lastExitCode: Int32?

    let workspaceRoot: String
    let actions: [ToolAction]

    init() {
        let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        if cwd.lastPathComponent == "CallweaveMac" {
            workspaceRoot = cwd.deletingLastPathComponent().deletingLastPathComponent().path
        } else {
            workspaceRoot = cwd.path
        }

        actions = [
            ToolAction(
                id: "pure-fixtures",
                title: "Pure capability fixtures",
                detail: "Runs the deterministic JSON fixture suite for pure business logic.",
                launchPath: "/bin/zsh",
                arguments: ["-lc", "npm run pure-capabilities:fixtures"]
            ),
            ToolAction(
                id: "business-logic-smoke",
                title: "Business logic smoke",
                detail: "Runs the broader JS smoke test over the current business logic kernel.",
                launchPath: "/bin/zsh",
                arguments: ["-lc", "npm run business-logic:smoke"]
            ),
            ToolAction(
                id: "traverse-contracts",
                title: "Traverse contract validation",
                detail: "Validates the checked-in Traverse draft contracts and workflow fixtures.",
                launchPath: "/bin/zsh",
                arguments: ["-lc", "node scripts/validate_traverse_contracts.mjs"]
            ),
            ToolAction(
                id: "workflow-fixtures",
                title: "Workflow fixtures",
                detail: "Runs deterministic workflow fixture checks for the daily local-first flow.",
                launchPath: "/bin/zsh",
                arguments: ["-lc", "node scripts/run_workflow_fixtures.mjs"]
            ),
            ToolAction(
                id: "audio-analyzer-help",
                title: "Audio analyzer help",
                detail: "Shows the current CLI usage surface for offline audio analysis.",
                launchPath: "/bin/zsh",
                arguments: ["-lc", "node scripts/analyze-audio.mjs --help || true"]
            )
        ]

        selectedActionID = actions.first?.id
    }

    var selectedAction: ToolAction? {
        actions.first { $0.id == selectedActionID } ?? actions.first
    }

    func runSelected() {
        guard !isRunning, let action = selectedAction else { return }

        isRunning = true
        output = "$ \(action.launchPath) \(action.arguments.joined(separator: " "))\n\n"
        lastExitCode = nil

        let process = Process()
        process.executableURL = URL(fileURLWithPath: action.launchPath)
        process.arguments = action.arguments
        process.currentDirectoryURL = URL(fileURLWithPath: workspaceRoot)

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe

        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let chunk = String(data: data, encoding: .utf8) else { return }
            Task { @MainActor in
                self?.output.append(chunk)
            }
        }

        process.terminationHandler = { [weak self] proc in
            pipe.fileHandleForReading.readabilityHandler = nil
            Task { @MainActor in
                self?.isRunning = false
                self?.lastExitCode = proc.terminationStatus
                self?.output.append("\n[exit \(proc.terminationStatus)]\n")
            }
        }

        do {
            try process.run()
        } catch {
            pipe.fileHandleForReading.readabilityHandler = nil
            isRunning = false
            output.append("Failed to launch process: \(error.localizedDescription)\n")
        }
    }
}

struct ContentView: View {
    @StateObject private var model = AppModel()

    var body: some View {
        NavigationSplitView {
            List(model.actions, selection: $model.selectedActionID) { action in
                VStack(alignment: .leading, spacing: 4) {
                    Text(action.title)
                    Text(action.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                .padding(.vertical, 4)
            }
            .navigationTitle("Callweave")
        } detail: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(model.selectedAction?.title ?? "No check selected")
                            .font(.title2)
                        Text(model.selectedAction?.detail ?? "")
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button(model.isRunning ? "Running..." : "Run Check") {
                        model.runSelected()
                    }
                    .disabled(model.isRunning || model.selectedAction == nil)
                }

                GroupBox {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Workspace")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(model.workspaceRoot)
                            .textSelection(.enabled)
                            .font(.system(.body, design: .monospaced))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let code = model.lastExitCode {
                    Text(code == 0 ? "Last run passed." : "Last run failed with exit code \(code).")
                        .foregroundStyle(code == 0 ? .green : .red)
                }

                ScrollView {
                    Text(model.output)
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                        .textSelection(.enabled)
                        .font(.system(.body, design: .monospaced))
                        .padding(12)
                }
                .background(Color(nsColor: .textBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .padding(20)
            .navigationTitle("Test App")
        }
        .frame(minWidth: 980, minHeight: 640)
    }
}

@main
struct CallweaveMacApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowResizability(.contentSize)
    }
}
