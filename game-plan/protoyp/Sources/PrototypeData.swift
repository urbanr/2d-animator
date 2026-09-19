import Foundation

struct PrototypeData: Codable {
    var maps: [MapAsset]
    var enemies: [EnemyAsset]
}
struct MapAsset: Codable, Identifiable {
    var id: String
    var name: String
    var variant: String
    var image: String
    var width: Double
    var height: Double
    var walkY: Double
    var reviewed: Bool
}
struct FrameAsset: Codable {
    var image: String
    var offsetX: Double
    var offsetY: Double
}
struct EnemyAsset: Codable, Identifiable {
    var id: String
    var character: String
    var name: String
    var title: String
    var variant: String
    var gameHeight: Double
    var frames: [FrameAsset]
}

enum PrototypeGeometry {
    static func groundY(bottom: Double, height: Double, normalizedTop: Double) -> Double {
        bottom + height * (1 - normalizedTop)
    }
    static func wrap(_ position: Double, length: Double) -> Double {
        guard length > 0 else { return 0 }
        return (position.truncatingRemainder(dividingBy: length) + length).truncatingRemainder(dividingBy: length)
    }
}
