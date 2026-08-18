// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "CallweaveMac",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "CallweaveMac", targets: ["CallweaveMac"])
    ],
    targets: [
        .executableTarget(
            name: "CallweaveMac",
            path: "Sources/CallweaveMac"
        )
    ]
)
