import SwiftUI

struct ContentView: View {
    @StateObject private var host = RecordingHost()
    @State private var route: Route = .today
    @State private var selectedSession: RecordingHost.Event?

    private enum Route: String, CaseIterable, Identifiable {
        case today = "Today", settings = "Settings"
        var id: String { rawValue }
        var symbol: String {
            switch self {
            case .today: "eye"; case .settings: "gearshape"
            }
        }
    }

    var body: some View {
        Group {
            if host.isRecording {
                ListeningSessionView(host: host)
            } else {
                applicationShell
            }
        }
    }

    private var applicationShell: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Label("Callweave", systemImage: "waveform")
                    .font(.headline)
                    .padding(.bottom, 28)
                ForEach(Route.allCases) { item in
                    Button { route = item } label: {
                        Label(item.rawValue, systemImage: item.symbol)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 10)
                    .background(route == item ? Color.green.opacity(0.14) : .clear, in: RoundedRectangle(cornerRadius: 8))
                }
                Button { host.start() } label: {
                    Label("Listen", systemImage: "waveform")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .disabled(host.availability != .ready)
                .padding(.horizontal, 10)
                Spacer()
                Text("Golden, BC")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(22)
            .frame(width: 160)
            Divider()
            Group {
                switch route {
                case .today: listeningHome
                case .settings: settings
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(minWidth: 760, minHeight: 560)
    }

    private var listeningHome: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Today")
                .font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Golden, BC · private place")
                .font(.headline)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 10) {
                Text(host.publicMessage).font(.title3)
                Text("Start a private listening session for the sounds around this place.")
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 14))

            HStack {
                if host.availability == .permissionRequired {
                    Button("Allow microphone") { Task { await host.requestPermission() } }
                } else if host.isRecording {
                    Button("Stop listening") { host.stop() }.buttonStyle(.borderedProminent)
                } else {
                    Button("Start listening") { host.start() }
                        .buttonStyle(.borderedProminent)
                        .disabled(host.availability != .ready)
                }
                Button("Refresh microphone") { host.refreshAvailability() }
            }

            if let diagnostic = host.diagnosticMessage {
                Text(diagnostic)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }

            if !host.events.filter({ $0.kind == .stopped }).isEmpty {
                Divider()
                Text("Past sessions").font(.headline)
                List(host.events.filter { $0.kind == .stopped }) { event in
                    Button { selectedSession = event } label: {
                        HStack { Label(event.occurredAt.formatted(date: .abbreviated, time: .shortened), systemImage: "waveform.path.ecg"); Spacer(); Image(systemName: "chevron.right").foregroundStyle(.tertiary) }
                    }.buttonStyle(.plain)
                }.frame(minHeight: 120)
            }
            Spacer()
        }
        .padding(38)
        .sheet(item: $selectedSession) { session in ArchiveSessionView(session: session) }
    }

    private var settings: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Settings").font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Private controls for this place and microphone.").foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 15) {
                setting("Privacy", "Private to this device")
                setting("Current place", "Golden, BC")
                setting("Microphone", host.availability == .ready ? "Connected" : "Needs permission")
                setting("Privacy", "Audio stays on this device")
            }
            .padding()
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 14))
            Spacer()
        }
        .padding(38)
    }

    private func setting(_ title: String, _ value: String) -> some View {
        HStack { Text(title).fontWeight(.medium); Spacer(); Text(value).foregroundStyle(.secondary) }
    }
}

private struct ArchiveSessionView: View {
    let session: RecordingHost.Event
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack {
                Button("Close") { dismiss() }
                Spacer()
            }
            Text("Listening session")
                .font(.system(size: 40, weight: .semibold, design: .serif))
            Text(session.occurredAt.formatted(date: .complete, time: .shortened))
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 10) {
                Label("Saved on this device", systemImage: "lock")
                Text("This private recording is available to Callweave on this Mac.")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 14))
            Spacer()
        }
        .padding(32)
        .frame(minWidth: 460, minHeight: 360)
    }
}

private struct ListeningSessionView: View {
    @ObservedObject var host: RecordingHost

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            VStack(spacing: 0) {
                HStack {
                    Label("Callweave", systemImage: "waveform")
                        .font(.headline)
                    Spacer()
                    Text("Golden, BC")
                        .foregroundStyle(.white.opacity(0.68))
                }
                .padding(32)

                Spacer()
                VStack(spacing: 18) {
                    ZStack {
                        Circle().stroke(.yellow.opacity(0.2), lineWidth: 1).frame(width: 250, height: 250)
                        Circle().stroke(.yellow.opacity(0.38), lineWidth: 1).frame(width: 180, height: 180)
                        Circle().fill(.yellow).frame(width: 86, height: 86)
                        Image(systemName: "waveform")
                            .font(.system(size: 31, weight: .medium))
                            .foregroundStyle(.green.opacity(0.9))
                    }
                    Text("Listening")
                        .font(.system(size: 58, weight: .semibold, design: .serif))
                    Text(elapsed(at: context.date))
                        .font(.system(.title2, design: .monospaced))
                    Text("Callweave is listening for the sounds around this place.")
                        .foregroundStyle(.white.opacity(0.68))
                }
                Spacer()

                HStack {
                    Button("Stop listening") { host.stop() }
                        .buttonStyle(.borderedProminent)
                        .tint(.white)
                        .foregroundStyle(.green)
                    Spacer()
                    Text("Audio stays on this device.")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.68))
                }
                .padding(32)
            }
            .frame(minWidth: 620, minHeight: 480)
            .foregroundStyle(.white)
            .background(Color(red: 0.07, green: 0.24, blue: 0.20))
        }
    }

    private func elapsed(at date: Date) -> String {
        let seconds = max(0, Int(date.timeIntervalSince(host.startedAt ?? date)))
        return String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }
}

@main
struct CallweaveMacApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
            .windowResizability(.contentSize)
            .handlesExternalEvents(matching: ["listen"])
    }
}
