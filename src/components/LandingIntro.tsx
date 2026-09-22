const STEPS = [
  {
    n: "01",
    title: "Dump reality",
    body: "Type what actually happened today, messy and unfiltered. No forms, no categories to pick, no habit to check off.",
  },
  {
    n: "02",
    title: "It separates fact from feeling",
    body: "Your words get split into real events, each tagged with how sure it can be — a claim isn't a fact, a hope isn't a plan.",
  },
  {
    n: "03",
    title: "Watch your life take shape",
    body: "Every entry joins a living 3D map: what's growing, what's stuck, what's quietly connected to what.",
  },
  {
    n: "04",
    title: "Know what to do next",
    body: "Not a streak to keep or a habit to guilt you — one clear, ranked next move, and the reason it matters.",
  },
];

export function LandingIntro() {
  return (
    <div className="w-full max-w-md text-left lg:max-w-sm">
      <p className="text-sm leading-relaxed text-mute">
        Most people's lives are scattered across notes apps, half-remembered conversations, and habit
        trackers that guilt more than they help. Nothing ever adds up to a picture of what&apos;s actually
        going on — or what to do about it.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        LifeOS is the opposite: you talk to it like a diary, and it does the organizing.
      </p>

      <div className="mt-8 space-y-5">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-3">
            <span className="font-mono text-xs text-gold-dim">{s.n}</span>
            <div>
              <p className="text-sm font-medium text-paper">{s.title}</p>
              <p className="mt-0.5 text-sm text-mute">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
