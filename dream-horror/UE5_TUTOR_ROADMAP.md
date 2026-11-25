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
