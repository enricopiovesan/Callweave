import SwiftUI

struct ContentView: View {
    @StateObject private var host = RecordingHost()

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Callweave")
                .font(.system(size: 48, weight: .semibold, design: .serif))
            Text("Local listening host")
                .font(.headline)
                .foregroundStyle(.secondary)

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

@main
struct CallweaveMacApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }.windowResizability(.contentSize)
    }
}
