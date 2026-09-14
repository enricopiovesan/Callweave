import AVFoundation
import Foundation

/// The target-local implementation of `traverse:platform/recording-host@0.1.0`.
/// It owns permissions, audio bytes, and the private artifact-to-file mapping.
@MainActor
final class RecordingHost: ObservableObject {
    enum Availability: String { case ready; case permissionRequired = "permission-required"; case unavailable; case backgroundUnsupported = "background-unsupported" }
    enum EventKind: String { case started; case stopped; case interrupted }
    struct Event: Identifiable { let id = UUID(); let kind: EventKind; let recordingReference: String?; let occurredAt = Date() }

    @Published private(set) var availability: Availability = .permissionRequired
    @Published private(set) var isRecording = false
    @Published private(set) var events: [Event] = []
    @Published private(set) var startedAt: Date?
    @Published private(set) var publicMessage = "Checking microphone access…"
    @Published private(set) var diagnosticMessage: String?

    private var recorder: AVAudioRecorder?
    private var activeReference: String?
    private var privateArtifacts: [String: URL] = [:]

    init() { refreshAvailability() }

    func refreshAvailability() {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            availability = .ready
            diagnosticMessage = nil
            publicMessage = isRecording ? "Listening" : "Ready to listen"
        case .notDetermined:
            availability = .permissionRequired; publicMessage = "Microphone permission is needed to listen."
        case .denied, .restricted:
            availability = .permissionRequired; publicMessage = "Allow microphone access in System Settings to listen."
        @unknown default:
            availability = .unavailable; publicMessage = "Listening is unavailable on this device."
        }
    }

    func requestPermission() async {
        guard AVCaptureDevice.authorizationStatus(for: .audio) == .notDetermined else { refreshAvailability(); return }
        let granted = await AVCaptureDevice.requestAccess(for: .audio)
        refreshAvailability()
        if !granted { publicMessage = "Microphone permission was not granted." }
    }

    /// WIT `start`, invoked only from a foreground user action.
    func start() {
        guard availability == .ready else {
            publicMessage = "Listening needs microphone access first."
            return
        }
        guard !isRecording else {
            publicMessage = "Listening is already active."
            return
        }
        publicMessage = "Starting listening…"
        diagnosticMessage = nil
        do {
            let reference = "recording:\(UUID().uuidString.lowercased())"
            let fileURL = try nextRecordingURL()
            let recorder = try AVAudioRecorder(url: fileURL, settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ])
            guard recorder.prepareToRecord(), recorder.record() else {
                availability = .unavailable
                publicMessage = "Listening could not start."
                diagnosticMessage = "macOS did not make the selected microphone available to the recorder."
                return
            }
            self.recorder = recorder; activeReference = reference; privateArtifacts[reference] = fileURL
            isRecording = true; startedAt = Date(); publicMessage = "Listening"; append(.started, reference: reference)
        } catch {
            availability = .unavailable; publicMessage = "Listening could not start."
            diagnosticMessage = error.localizedDescription
        }
    }

    /// WIT `stop`; the opaque reference is the only artifact identity returned.
    func stop() {
        guard isRecording else { return }
        let reference = activeReference
        recorder?.stop()
        recorder = nil; activeReference = nil; isRecording = false; startedAt = nil
        publicMessage = "Recording saved locally"; append(.stopped, reference: reference)
    }

    private func append(_ kind: EventKind, reference: String?) {
        events.insert(Event(kind: kind, recordingReference: reference), at: 0)
        if events.count > 32 { events.removeLast() }
    }

    private func nextRecordingURL() throws -> URL {
        let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let directory = support.appendingPathComponent("Callweave/Recordings", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent("\(UUID().uuidString.lowercased()).m4a")
    }
}
