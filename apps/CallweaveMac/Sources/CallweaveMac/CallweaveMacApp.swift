import SwiftUI

private enum CallweaveTheme {
    static let canvas = Color(red: 0.96, green: 0.96, blue: 0.95)
    static let ink = Color(red: 0.07, green: 0.07, blue: 0.065)
    static let olive = Color(red: 0.30, green: 0.40, blue: 0.23)
    static let listening = Color(red: 0.07, green: 0.075, blue: 0.065)
}

struct ContentView: View {
    @StateObject private var host = RecordingHost()
    @State private var route: Route = .today
    @State private var selectedSession: RecordingHost.Event?

    private enum Route: String, CaseIterable, Identifiable {
        case today = "Sessions", settings = "Settings"
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
                Button { host.start() } label: {
                    Label("Listen", systemImage: "waveform")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .disabled(host.availability != .ready)
                .padding(.horizontal, 10)
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
                Spacer()
                Text("Golden, BC")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(width: 220)
            .background(Color.white.opacity(0.72))
            Divider()
            Group {
                switch route {
                case .today: listeningHome
                case .settings: settings
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(minWidth: 900, minHeight: 620)
        .foregroundStyle(CallweaveTheme.ink)
        .background(CallweaveTheme.canvas)
        .tint(CallweaveTheme.olive)
    }

    private var listeningHome: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 14) {
                        Text("Sessions").font(.system(size: 56, weight: .regular, design: .serif)).tracking(-2.5)
                        Text("\(host.events.filter { $0.kind == .stopped }.count) logs")
                            .font(.caption.weight(.bold)).padding(.horizontal, 11).padding(.vertical, 7)
                            .foregroundStyle(.white).background(CallweaveTheme.olive, in: Capsule())
                    }
                    Text("Your field recordings, woven into wildlife observations.")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button { startOrRequestPermission() } label: {
                    Label(host.availability == .permissionRequired ? "Allow microphone" : "Start listening", systemImage: "waveform")
                        .fontWeight(.semibold).padding(.horizontal, 15).padding(.vertical, 10)
                }
                .buttonStyle(.plain).foregroundStyle(.white).background(CallweaveTheme.ink, in: Capsule())
                .disabled(host.availability != .ready && host.availability != .permissionRequired)
            }

            if let diagnostic = host.diagnosticMessage {
                Text(diagnostic)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }

            Text("RECENT RECORDINGS").font(.caption.weight(.bold)).tracking(1.2).foregroundStyle(.secondary).padding(.top, 52).padding(.bottom, 15)
            let sessions = host.events.filter { $0.kind == .stopped }
            if sessions.isEmpty {
                VStack(alignment: .leading, spacing: 8) { Text("Your first session starts here.").font(.headline); Text("Start listening to create a private recording at this place.").foregroundStyle(.secondary) }
                    .frame(maxWidth: .infinity, minHeight: 140, alignment: .leading).padding(22).background(.white, in: RoundedRectangle(cornerRadius: 16))
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(sessions) { event in
                        Button { selectedSession = event } label: {
                            VStack(alignment: .leading, spacing: 10) { HStack { Text(event.occurredAt.formatted(date: .abbreviated, time: .shortened)).font(.caption.weight(.semibold)); Spacer(); Image(systemName: "arrow.up.right").font(.caption) }; Text("Golden, BC").font(.headline); Text("Saved locally").font(.caption).foregroundStyle(.secondary); Spacer() }
                                .frame(maxWidth: .infinity, minHeight: 116, alignment: .leading).padding(18).background(.white, in: RoundedRectangle(cornerRadius: 16))
                        }.buttonStyle(.plain)
                    }
                }
            }
            Spacer()
        }
        .padding(52)
        .sheet(item: $selectedSession) { session in ArchiveSessionView(host: host, session: session) }
    }

    private func startOrRequestPermission() {
        if host.availability == .permissionRequired { Task { await host.requestPermission() } }
        else { host.start() }
    }

    private var settings: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Settings").font(.system(size: 56, weight: .regular, design: .serif)).tracking(-2.5)
            VStack(alignment: .leading, spacing: 15) {
                setting("Microphone", host.availability == .ready ? "Connected" : "Needs permission")
                setting("Current location", "Golden, BC")
                setting("Private recordings", "Audio stays on this Mac")
            }
            .padding()
            .background(.white, in: RoundedRectangle(cornerRadius: 18))
            Spacer()
        }
        .padding(38)
    }

    private func setting(_ title: String, _ value: String) -> some View {
        HStack { Text(title).fontWeight(.medium); Spacer(); Text(value).foregroundStyle(.secondary) }
    }
}

private struct ArchiveSessionView: View {
    @ObservedObject var host: RecordingHost
    let session: RecordingHost.Event
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack {
                Button("Close") { dismiss() }
                Spacer()
            }
            Text("Listening session")
                .font(.system(size: 40, weight: .bold))
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
            Button("Listen back") { host.play(reference: session.recordingReference) }
                .buttonStyle(.borderedProminent)
            VStack(alignment: .leading, spacing: 8) {
                Text("Recognized · 0").font(.headline)
                Text("No animals have been identified yet. This session remains ready for analysis.")
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
                    Label("LISTENING", systemImage: "circle.fill")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 10).padding(.vertical, 6).background(.white.opacity(0.12), in: Capsule())
                    Spacer()
                    Text("Callweave").fontWeight(.bold)
                }
                .padding(32)

                Spacer()
                VStack(spacing: 18) {
                    Text(elapsed(at: context.date))
                        .font(.system(size: 64, weight: .bold, design: .default))
                    Text("Golden, BC").foregroundStyle(.white.opacity(0.62))
                    Image(systemName: "waveform")
                        .font(.system(size: 62, weight: .regular))
                        .foregroundStyle(.white)
                    Text("Keep this Mac awake. Callweave is capturing nearby calls in high fidelity.")
                        .multilineTextAlignment(.center).padding().background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16)).foregroundStyle(.white.opacity(0.68))
                }
                Spacer()

                HStack {
                    Spacer()
                    Button { host.stop() } label: { Circle().fill(CallweaveTheme.olive).frame(width: 70, height: 70).overlay(Circle().stroke(.white, lineWidth: 4)) }
                    Spacer()
                }
                .padding(32)
            }
            .frame(minWidth: 620, minHeight: 480)
            .foregroundStyle(.white)
            .background(CallweaveTheme.listening)
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
