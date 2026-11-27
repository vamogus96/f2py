# Hollow Lullaby → Unreal Engine 5 (C++) — Tutor Roadmap

The browser prototype (`index.html`) is your **design reference**: every mechanic below already works there, so you
can play it, then rebuild it in UE5 one lesson at a time. This file does **not** contain the finished game. Each lesson
gives you the *logic*, a *small commented example* and a *homework task*, which is how you actually learn the engine.

> Suggested Custom Instruction for Cline/Continue (from your screenshots):
> "Act as a senior C++ tutor for Unreal Engine 5. Don't write the full code at once: explain the logic first,
> show small commented examples, and always explain what Unreal macros (UPROPERTY, UFUNCTION) and pointers do."

## Mechanic → Unreal class map

| Prototype mechanic | Unreal building block |
|---|---|
| First-person movement + look | `ACharacter`, `UCameraComponent`, Enhanced Input |
| Press **E** on objects | `LineTraceSingleByChannel`, an `IInteractable` interface |
| Flashlight (F) | `USpotLightComponent` toggled from input |
| Hold **Q** to close eyes | Input action + a float `EyeClosure` driving a post-process material |
| The **Watcher** (moves only when unseen) | `AWatcherAI` + `AAIController` + a "was I seen?" test each tick |
| Sanity | `UActorComponent` (`USanityComponent`) + `FOnSanityChanged` delegate |
| Wobble / vignette / grain / chromatic aberration | `UPostProcessComponent` + a dynamic Material Instance fed by sanity |
| Looping hallway | Teleport the player by one period when they cross a trigger (`ATriggerBox`) |
| Chapter flow | Level streaming or one `UGameInstanceSubsystem` holding chapter state |
| Procedural audio drone / whispers | MetaSounds (parameter = sanity) |

## Lesson plan

### Lesson 1 — Project + the C++ ↔ Blueprint split
Create a **Games → First Person → C++** project, then connect VS Code (generate project files, `compile_commands.json`).
Learn: what `UCLASS()`, `GENERATED_BODY()` and `#include "X.generated.h"` do (the Unreal Header Tool reads them to
generate reflection code).
*Homework:* make `AHollowCharacter : ACharacter`, compile, and set it as the default pawn in the GameMode.

### Lesson 2 — Movement and look (Enhanced Input)
Logic: an **Input Action** produces a value, an **Input Mapping Context** binds keys to actions, your character binds
actions to functions.
```cpp
// HollowCharacter.h
UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input") // UPROPERTY: visible to the editor, GC and Blueprint
TObjectPtr<UInputAction> MoveAction;                          // TObjectPtr: UE5's GC-aware pointer

void Move(const FInputActionValue& Value);                    // plain C++ callback, bound in SetupPlayerInputComponent
```
*Homework:* WASD + mouse look + sprint. Compare feel with the prototype (walk 2.5, run 4.3 m/s).

### Lesson 3 — Interaction with a line trace
Logic: from the camera, trace forward ~250 cm; if the hit actor implements `IInteractable`, show a prompt.
```cpp
FHitResult Hit;
const FVector Start = Camera->GetComponentLocation();
const FVector End   = Start + Camera->GetForwardVector() * 250.f;
if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility))
{
    // Cast<> returns nullptr if the actor is not the type — always null-check raw results.
    if (Hit.GetActor()->Implements<UInteractable>()) { /* show prompt */ }
}
```
*Homework:* the music box from Chapter I. `UFUNCTION(BlueprintNativeEvent) void Interact(AActor* Instigator);`

### Lesson 4 — Flashlight + eye closing
`USpotLightComponent` attached to the camera; flicker by lerping intensity with a noise value when sanity is low.
Eye closing: hold Q → interpolate `EyeClosure` 0→1 and feed it to a post-process material (same eyelid math as the
`edge` term in the prototype shader).

### Lesson 5 — Sanity component and delegates
```cpp
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSanityChanged, float, NewValue);

UCLASS(ClassGroup=(Horror), meta=(BlueprintSpawnableComponent))
class USanityComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintAssignable) FOnSanityChanged OnSanityChanged; // others subscribe; no polling
    UFUNCTION(BlueprintCallable) void Drain(float Amount);           // callable from Blueprint
private:
    float Sanity = 1.f;
};
```
*Homework:* make the HUD bar and post-process both **listen** to `OnSanityChanged`.

### Lesson 6 — Post-process driven by fear
Build a post-process Material (wobble UV, chromatic aberration, vignette, grain). Create a `UMaterialInstanceDynamic`
in `BeginPlay`, store it in a `UPROPERTY()` (otherwise the garbage collector may free it), and call
`SetScalarParameterValue("Insanity", X)` each time sanity changes.

### Lesson 7 — The Watcher (the core of the game)
Logic each tick:
1. Is the Watcher inside the player's view cone? `Dot(CameraForward, DirToWatcher) > cos(halfFov)`.
2. Is there line of sight? A visibility line trace from camera to the Watcher.
3. Seen **and** eyes open → stop moving, drain sanity. Otherwise → `AIController->MoveToActor(Player)`.
4. Within 100 cm → call `GameMode->PlayerCaught()`.
Tip: UE also provides `AActor::WasRecentlyRendered()`, but it ignores line of sight and shadows. Learn why, then do it by hand.
*Homework:* make speed scale with the number of memories collected, as in Chapter III.

### Lesson 8 — The repeating hallway
Build one hallway module as a Blueprint with a `ATriggerBox` at each end. On overlap, `SetActorLocation(Player, Location ± Period)`.
Swap materials/lights per loop with a `LoopIndex` stored in the GameMode. Hide the jump with a short blackout.

### Lesson 9 — Audio with MetaSounds
One MetaSound source: layered low sines (≈43 Hz), filtered noise for whispers, a heartbeat whose BPM is a parameter.
Drive it with `SetFloatParameter` from `USanityComponent`.

### Lesson 10 — Chapters, fail states, packaging
Level streaming per chapter, a checkpoint struct, fade-to-black on "caught", then **Package Project** and test a build.
Add it to your portfolio with a short capture of the Watcher mechanic.

## How to learn with the prototype
Play it once, then pick a lesson and open `game.js` only to read the matching function:
`updateWatcher` (Lesson 7), `canSee` (Lesson 7), the `post` shader (Lesson 6), `ch1.update` (Lesson 8), `A.update` (Lesson 9).
Reimplement the idea in UE rather than translating line by line: you'll learn Unreal's way of solving it.

## Bonus lesson — the Verdant (phototropic monster)
Prototype: `makePlantMan`, `animatePlantMan`, `ch4.update` in `game.js`.
- **Logic:** speed depends on a *player state*, not on being seen: flashlight on → fast, off → slow, running → +noise.
  In UE5: read `SpotLightComponent->IsVisible()` from the character, or use `UAIPerceptionComponent` with sight + hearing senses and map "light on" to a larger sight radius.
- **Procedural animation:** sway vines/petals with sine waves in C++ (`USceneComponent::SetRelativeRotation` per tick) or, cheaper, in the material with **World Position Offset**.
- **Dormant-until-triggered:** spawn it with AI disabled (`AIController->StopMovement()`), enable it from a delegate fired when the first note is picked up.
- *Homework:* add a `UPROPERTY(EditAnywhere) float LitSpeed, DarkSpeed;` so a designer can tune it in the editor without recompiling.

## Bonus lesson — the Oxygen Tax Bureau (UI-driven gameplay)
Prototype: `chOffice` and the `APPS` table in `game.js`.
- **Data, not code:** put applicants in a **Data Table** (`USTRUCT(BlueprintType) struct FApplicant : public FTableRowBase` with `UPROPERTY` fields). Designers add applicants without recompiling.
- **Rules as functions:** `TArray<FString> Violations(const FApplicant&) const` and `EDecision Expected(...)`. Write them as pure functions so you can unit-test them with the Automation framework.
- **UI:** UMG widgets (`UUserWidget` subclass with `UPROPERTY(meta=(BindWidget)) UButton* ApproveButton;`). `BindWidget` makes the C++ class require a widget of that name in the Blueprint layout.
- **Seated player:** switch input mode with `SetInputMode(FInputModeGameAndUI())` and show the cursor.

## Bonus lesson — dream sessions and the tinnitus resonance
- **Seeds:** `FRandomStream Stream(Seed);` makes every roll reproducible. Store the seed in a `UGameInstanceSubsystem` so it survives level changes.
- **Strangeness:** each modifier is a scalar in a Material Parameter Collection (hue, invert, roll), read by your post-process material.
- **Echoes:** actors whose material opacity is driven by a `ListenAmount` float, interactable only while `ListenAmount > 0.5`. Tinnitus is a MetaSound sine pair whose gain follows the same float.

## Bonus lesson — combat sessions (2.5D, Hotline Miami × Superhot)
Prototype: `chCombat` in `game.js`.
- **Camera:** a `USpringArmComponent` with a fixed pitch (~-60°) and `bInheritYaw = false`, plus a look-ahead offset toward the cursor (`GetHitResultUnderCursor`).
- **Superhot time:** each tick set `UGameplayStatics::SetGlobalTimeDilation(World, Lerp(0.05, 1, PlayerSpeed / MaxSpeed))`. Then set `CustomTimeDilation = 1 / GlobalDilation` on the player so they still move in real time. Add a short burst when they fire.
- **One-hit kills:** a `UHealthComponent` with `MaxHealth = 1` and an `OnDeath` delegate. Swap the mesh for a **Chaos Geometry Collection** to get the glass shatter.
- **Weapons as data:** `UPrimaryDataAsset` per weapon (range, arc, ammo, pellets, spread), with a `UFUNCTION(BlueprintCallable) Throw()` that spawns a projectile carrying the asset.
- *Homework:* make enemy bullets slow projectiles (`UProjectileMovementComponent`) and let a melee swing destroy them, like the pipe in the prototype.

## Bonus lesson — multiplayer naval battle (replication)
Prototype: `naval.js` + `server.js`. In the prototype the relay is dumb and **the player who is hit decides the damage**. In UE5 the server is the authority instead.
- **Authority model:** `HasAuthority()` is true on the server. Only the server applies damage (`ApplyDamage`), spawns projectiles and changes score. Clients send *intent* and only show the result.
- **Replicated state:** mark ship fields `UPROPERTY(Replicated)` and list them in `GetLifetimeReplicatedProps` with `DOREPLIFETIME(AShip, Health);`. For one-time reactions to a change use `ReplicatedUsing=OnRep_Health`.
- **RPCs (intent):** `UFUNCTION(Server, Reliable) void ServerFire(bool bStarboard);` is called on the client and runs on the server. The server then spawns a replicated `AShell` actor (`bReplicates = true`). Use `Unreliable` for things like steering input sent every frame.
- **Smooth movement:** use a `UFloatingPawnMovement` or `UCharacterMovementComponent`; they already do client prediction. For free-flight ships, replicate position at ~15 Hz and interpolate, exactly as `chNaval` does with `lerp(s.x, s.tx, …)`.
- **Teams and scoring:** keep kills in `AGameState` (`UPROPERTY(Replicated) int32 PirateScore, NavyScore;`) and use `AGameMode::EndMatch`.
- **Testing:** *Play → Number of Players = 2, Net Mode = Play as Client* runs a dedicated server plus two clients in the editor.
- *Homework:* replace the prototype's "victim reports the kill" with a server-side `TakeDamage` and compare how a cheater could abuse each design.

## Bonus lesson — the day planner (systems design)
Prototype: `day.js`. A day is a **budget of two resources** (time and energy) spent on activities that convert them to money, parts and skill.
- Model each activity as a `UDataAsset` or a data-table row (`FActivityRow`: `Location`, `Minutes`, `Energy`, `Pay`, `RequiredSkill`). Designers can add jobs without code.
- Keep the simulation in a `UGameInstanceSubsystem` (`UDayPlannerSubsystem`) and the UI in UMG. The UI reads state via delegates, so it never polls.
- Mini-games (PCB routing, lathe, cooking) are small self-contained classes that return a **result struct** (`FMinigameResult { float Quality; bool bSuccess; }`) to the planner. Write them so they can be unit-tested without the UI.

## Bonus lesson — the soldering mini-game (a small state machine)
Prototype: `gameSolder` and `lessonSolder` in `day.js`.
- **State:** `Temp` rises while the iron is held, falls otherwise; `Flow` rises only while feeding inside the temperature band. A joint ends when `Flow >= 1` and the player releases, when it overflows (blob), burns (`Burn >= 1.2`) or is released cold. Model it as an enum plus `Tick(DeltaTime)`: `enum class EJointResult { Good, Cold, Burnt, Blob };`
- **Judging:** the result comes from three accumulators (`Cold`, `Burn`, `Flow`), never from a single timer. That is easier to tune in a `UDataAsset` (`BandMin`, `BandMax`, `FlowRate`).
- **Coaching:** a pure function `FText GetHint(const FSolderState&)` picks the hint, so the tutorial and the paid job share one mini-game with `bShowHints` switched on or off.
- **Tutorial flow:** a list of steps (`TArray<FLessonStep>`), each with a pass condition. Retry on fail, award the certificate once (a `SaveGame` flag).
- *Homework:* add a *bridge* mechanic: adjacent pads short out if both get a blob. Expose the tolerances to designers with `UPROPERTY(EditAnywhere, meta=(ClampMin=0))`.
