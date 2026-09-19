import SwiftUI
import SpriteKit

@main
struct PrototypeApp: App {
    var body: some Scene { WindowGroup { PrototypeView().preferredColorScheme(.dark) } }
}

@MainActor
final class PrototypeStore: ObservableObject {
    let data: PrototypeData?
    let scene: RunScene
    let error: String?
    init() {
        let root = Bundle.main.resourceURL!.appendingPathComponent("GameData")
        scene = RunScene(root: root)
        do {
            let loaded = try JSONDecoder().decode(PrototypeData.self, from: Data(contentsOf: root.appendingPathComponent("catalog.json")))
            guard !loaded.maps.isEmpty, !loaded.enemies.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
            data = loaded; error = nil
        } catch { data = nil; self.error = "Nepodařilo se načíst herní podklady: \(error.localizedDescription)" }
    }
}

struct PrototypeView: View {
    @StateObject private var store = PrototypeStore()
    @Environment(\.scenePhase) private var scenePhase
    @State private var mapID = "hrbitov/composition-v2"
    @State private var enemyID = "bezec/wide-loop-v4"
    @State private var count = 8
    @State private var speed = 80.0
    @State private var zoom = 1.0
    @State private var mirror = true
    @State private var showLine = true
    @State private var paused = false
    @State private var settings = false
    private var configuration: String { "\(mapID)|\(enemyID)|\(count)|\(speed)|\(zoom)|\(mirror)|\(showLine)" }
    private var map: MapAsset? { store.data?.maps.first { $0.id == mapID } ?? store.data?.maps.first }
    private var enemy: EnemyAsset? { store.data?.enemies.first { $0.id == enemyID } ?? store.data?.enemies.first }
    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()
            NativeSceneView(scene: store.scene, paused: paused || settings || scenePhase != .active)
                .ignoresSafeArea()
                .accessibilityLabel("Prototyp: nepřátelé běží zleva doprava po lince mapy")
            if let error = store.error { Text(error).padding().background(.regularMaterial) }
            HStack(spacing: 12) {
                Button { settings = true } label: { Label("Výběr", systemImage: "slider.horizontal.3") }
                    .accessibilityIdentifier("settingsButton")
                Spacer()
                Text("\(map?.name ?? "Mapa") · \(enemy?.name ?? "Nepřítel") × \(count)")
                    .font(.caption.bold()).lineLimit(1)
                Spacer()
                Button { paused.toggle() } label: { Image(systemName: paused ? "play.fill" : "pause.fill") }
                    .accessibilityLabel(paused ? "Pokračovat" : "Pozastavit")
                Button { configure() } label: { Image(systemName: "arrow.counterclockwise") }.accessibilityLabel("Spustit znovu")
            }
            .padding(10).background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 12).padding(.top, 4)
        }
        .buttonStyle(.bordered)
        .onAppear { configure() }
        .onChange(of: configuration) { _, _ in configure() }
        .sheet(isPresented: $settings) { settingsView }
    }
    private func configure() {
        guard let map, let enemy else { return }
        store.scene.configure(map: map, enemy: enemy, count: count, speed: speed, zoom: zoom, mirror: mirror, showLine: showLine)
    }
    private var settingsView: some View {
        NavigationStack {
            Form {
                Section("Scéna") {
                    Picker("Mapa", selection: $mapID) {
                        ForEach(store.data?.maps ?? []) { map in Text("\(map.name) · \(map.variant)").tag(map.id) }
                    }
                    Picker("Nepřítel a varianta", selection: $enemyID) {
                        ForEach(store.data?.enemies ?? []) { enemy in Text(enemy.title).tag(enemy.id) }
                    }
                    Stepper("Počet: \(count)", value: $count, in: 1...100)
                        .accessibilityIdentifier("enemyCount")
                }
                Section("Pohyb zleva doprava") {
                    LabeledContent("Rychlost", value: "\(Int(speed)) bodů/s")
                    Slider(value: $speed, in: 20...220, step: 10).accessibilityLabel("Rychlost běhu")
                    LabeledContent("Měřítko postav", value: String(format: "%.1f×", zoom))
                    Slider(value: $zoom, in: 0.5...3, step: 0.25).accessibilityLabel("Měřítko postav")
                    Toggle("Zrcadlit postavu směrem doprava", isOn: $mirror)
                    Toggle("Ukázat žlutou linku chůze", isOn: $showLine)
                }
                Section {
                    Text("Linka: \(Int((map?.walkY ?? 0) * 100)) % shora · \(map?.reviewed == true ? "uložená poloha" : "výchozí odhad")")
                    Text("Podklady jsou offline kopií galerie při sestavení. Po změně linky či animace na Macu znovu exportuj podklady a nahraj aplikaci. Výběr v prototypu nemění produkční varianty.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Zkušební běh")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Hotovo") { settings = false } } }
        }
    }
}

struct NativeSceneView: UIViewRepresentable {
    let scene: RunScene
    var paused: Bool
    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.preferredFramesPerSecond = 60
        view.ignoresSiblingOrder = true
        view.presentScene(scene)
        return view
    }
    func updateUIView(_ view: SKView, context: Context) {
        if view.scene !== scene { view.presentScene(scene) }
        view.isPaused = paused
    }
}
