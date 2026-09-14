import SwiftUI

struct ContentView: View {
    @StateObject private var host = RecordingHost()

    var body: some View {
        Group {
            if host.isRecording {
                ListeningSessionView(host: host)
            } else {
                listeningHome
            }
        }
    }

    private var listeningHome: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Callweave")
                .font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Local listening host")
                .font(.headline)
                .foregroundStyle(.secondary)
            Text("Development build 0.1.0")
                .font(.caption)
                .foregroundStyle(.tertiary)

            VStack(alignment: .leading, spacing: 10) {
                Text(host.publicMessage).font(.title3)
                Text("This installed host owns microphone access and stores recordings locally. The web app only renders its governed lifecycle updates.")
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
                Button("Check connection") { host.refreshAvailability() }
            }

            if let diagnostic = host.diagnosticMessage {
                Text(diagnostic)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }

            if !host.events.isEmpty {
                Divider()
                Text("Listening updates").font(.headline)
                List(host.events) { event in
                    HStack {
                        Text(event.kind.rawValue.capitalized)
                        Spacer()
                        Text(event.occurredAt, style: .time).foregroundStyle(.secondary)
                    }
                }
                .frame(minHeight: 140)
            }
            Spacer()
        }
        .padding(32)
        .frame(minWidth: 620, minHeight: 480)
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
