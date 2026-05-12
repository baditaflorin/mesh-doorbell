import { useEffect, useRef, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Ring = { id: string; fromName: string; ts: number };
type Role = "host" | "guest";

const ROLE_KEY = (prefix: string) => `${prefix}:role`;
const NAME_KEY = (prefix: string) => `${prefix}:displayName`;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="bell-screen">
        <h1>doorbell</h1>
        <p className="bell-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [role, setRole] = useState<Role>(
    () => (localStorage.getItem(ROLE_KEY(config.storagePrefix)) as Role) ?? "host",
  );
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [armed, setArmed] = useState(false);
  const [, rerender] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const seenRingsRef = useRef<Set<string>>(new Set());
  const flashRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(ROLE_KEY(config.storagePrefix), role);
  }, [role, config.storagePrefix]);
  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const rings = room.doc.getArray<Ring>("rings");
    rings.toArray().forEach((r) => seenRingsRef.current.add(r.id));
    const onChange = () => {
      if (role === "host" && armed) {
        const latest = rings.toArray();
        for (const r of latest) {
          if (seenRingsRef.current.has(r.id)) continue;
          seenRingsRef.current.add(r.id);
          ringChime();
          flashScreen();
        }
      }
      rerender((n) => n + 1);
    };
    rings.observe(onChange);
    return () => rings.unobserve(onChange);
  }, [room, role, armed]);

  function ringChime() {
    try {
      audioRef.current ??= new AudioContext();
      const ctx = audioRef.current;
      const start = ctx.currentTime;
      [0, 0.18, 0.36].forEach((dt, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g).connect(ctx.destination);
        o.frequency.value = i === 1 ? 660 : 880;
        const at = start + dt;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
        o.start(at);
        o.stop(at + 0.2);
      });
    } catch {
      // ignored
    }
  }

  function flashScreen() {
    if (flashRef.current !== null) window.clearTimeout(flashRef.current);
    document.documentElement.dataset["meshFlash"] = "1";
    flashRef.current = window.setTimeout(() => {
      delete document.documentElement.dataset["meshFlash"];
    }, 1200);
  }

  // Recomputed every render so observer-triggered rerenders pick up new entries.
  const rings = [...room.doc.getArray<Ring>("rings").toArray()].reverse();

  const ring = () => {
    const myName = name.trim() || "someone at the door";
    room.doc
      .getArray<Ring>("rings")
      .push([{ id: crypto.randomUUID(), fromName: myName, ts: Date.now() }]);
  };

  return (
    <div className="bell-screen" data-role={role}>
      <header className="bell-header">
        <h1>doorbell</h1>
        <div className="bell-role-switch">
          <button
            type="button"
            className={role === "host" ? "is-active" : ""}
            onClick={() => setRole("host")}
          >
            I&apos;m home
          </button>
          <button
            type="button"
            className={role === "guest" ? "is-active" : ""}
            onClick={() => setRole("guest")}
          >
            I&apos;m at the door
          </button>
        </div>
      </header>

      {role === "guest" && (
        <>
          <input
            className="bell-name"
            placeholder="who's at the door?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
          />
          <button type="button" className="bell-ring" onClick={ring}>
            🔔 RING
          </button>
          <p className="bell-help">
            Print the QR for this URL and stick it on your door. Visitors scan and tap RING.
          </p>
        </>
      )}

      {role === "host" && (
        <>
          {!armed ? (
            <button
              type="button"
              className="bell-arm"
              onClick={() => {
                setArmed(true);
                try {
                  audioRef.current = new AudioContext();
                } catch {
                  // ignore
                }
              }}
            >
              arm (one tap to enable sound)
            </button>
          ) : (
            <p className="bell-armed">listening · sound will play on the next ring</p>
          )}
          <ul className="bell-log">
            {rings.length === 0 && <li className="bell-empty">no rings yet</li>}
            {rings.map((r) => (
              <li key={r.id}>
                <span className="bell-log-name">{r.fromName}</span>
                <span className="bell-log-time">{new Date(r.ts).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
