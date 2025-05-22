import AnimatedBorderTrail from "@/components/animata/container/animated-border-trail";

export default function AnimatedBorderTrailDemoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-10 space-y-8">
      <h1 className="text-3xl font-bold text-white mb-8">AnimatedBorderTrail Demo</h1>

      <div className="flex items-center justify-center bg-zinc-900 p-12">
        <AnimatedBorderTrail
          className="rounded-full bg-zinc-600 hover:bg-zinc-500"
          contentClassName="rounded-full bg-zinc-800"
          trailColor="white"
          // duration wird hier nicht explizit gesetzt, daher wird der Defaultwert "10s" aus der Komponente verwendet
        >
          <button className="rounded-full px-3 py-1 text-sm text-white">
            Learn more →
          </button>
        </AnimatedBorderTrail>
      </div>

      <AnimatedBorderTrail
        duration="5s" // Dauer hier auf 5 Sekunden gesetzt
        trailColor="purple"
        trailSize="lg"
      >
        <div className="max-w-sm text-balance p-4 text-center font-medium text-zinc-400">
          No longer wasting hours 🕕 looking for the inspiration or trying to write everything from scratch 📝.
        </div>
      </AnimatedBorderTrail>

      <AnimatedBorderTrail
        duration="15s" // Dauer hier auf 15 Sekunden gesetzt
        trailColor="cyan"
        trailSize="sm"
        className="rounded-lg"
        contentClassName="rounded-md bg-slate-800"
      >
        <div className="p-6 text-slate-100">
          <h2 className="text-xl font-semibold mb-2">Another Example</h2>
          <p className="text-sm text-slate-300">
            This card uses a different duration, trail color, and size.
            The animation should be slower.
          </p>
        </div>
      </AnimatedBorderTrail>
    </div>
  );
}
