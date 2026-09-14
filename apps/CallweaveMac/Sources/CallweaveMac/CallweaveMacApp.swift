import SwiftUI

struct ContentView: View {
    @StateObject private var host = RecordingHost()
    @State private var route: Route = .today

    private enum Route: String, CaseIterable, Identifiable {
        case today = "Today", archive = "Archive", review = "Review", place = "Place"
        var id: String { rawValue }
        var symbol: String {
            switch self {
            case .today: "eye"; case .archive: "archivebox"; case .review: "waveform"; case .place: "mappin"
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
                case .archive: archive
                case .review: review
                case .place: place
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
            Text("Partial coverage · 14 retained sound events")
                .font(.caption)
                .foregroundStyle(.tertiary)

            VStack(alignment: .leading, spacing: 10) {
                Text(host.publicMessage).font(.title3)
                Text("Callweave listens for the sounds around this place and keeps recordings on this device.")
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
        .padding(38)
    }

    private var archive: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Archive").font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Daily canvases from this place").foregroundStyle(.secondary)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(["August 17", "August 16", "August 15", "August 14", "August 13", "August 12"], id: \.self) { day in
                    VStack(alignment: .leading, spacing: 8) {
                        Image(systemName: "waveform.path.ecg").font(.title2).foregroundStyle(.green)
                        Text(day).font(.headline)
                        Text(day == "August 17" ? "Partial coverage" : "Listening complete").font(.caption).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 105, alignment: .leading)
                    .padding()
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 12))
                }
            }
            Spacer()
        }
        .padding(38)
    }

    private var review: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Review").font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Needs a closer listen").foregroundStyle(.secondary)
            ForEach(["Three-note call · recurring at dawn", "High insect-like trill · after rain"], id: \.self) { item in
                HStack(spacing: 14) {
                    Circle().fill(.green).frame(width: 9, height: 9)
                    VStack(alignment: .leading) { Text(item).font(.headline); Text("Retained evidence · awaiting review").font(.caption).foregroundStyle(.secondary) }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(.secondary)
                }
                .padding(.vertical, 14)
                Divider()
            }
            Spacer()
        }
        .padding(38)
    }

    private var place: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text("Golden, BC").font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Private location profile").foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 15) {
                setting("Privacy", "Private to this device")
                setting("Listening window", "From dawn to dusk")
                setting("Sound review", "Ask before confirming a finding")
                setting("Retention", "Managed by this place’s policy")
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
