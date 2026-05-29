// Utilidad para reproducir efectos de sonido con latencia mínima.
//
// Usa la Web Audio API en lugar de HTMLAudioElement: el clip se descarga y
// decodifica UNA sola vez a un AudioBuffer, y cada reproducción dispara un
// BufferSource nuevo (start(0)), que arranca de forma casi instantánea. Esto
// evita el lag típico de `new Audio().play()`, que decodifica/bufferea en el
// momento de reproducir.
//
// Llamá `preloadSound(src)` al montar la vista para que el buffer esté listo
// antes del primer uso; `playSound(src)` reproduce (y precarga on-demand si
// hace falta).

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function loadBuffer(src: string): Promise<AudioBuffer | null> {
  const existing = loading.get(src);
  if (existing) return existing;

  const c = getCtx();
  if (!c) return Promise.resolve(null);

  const p = fetch(src)
    .then((res) => res.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buf) => {
      buffers.set(src, buf);
      loading.delete(src);
      return buf;
    })
    .catch(() => {
      loading.delete(src);
      return null;
    });

  loading.set(src, p);
  return p;
}

/** Descarga y decodifica el clip por anticipado, sin reproducirlo. */
export function preloadSound(src: string): void {
  if (buffers.has(src)) return;
  void loadBuffer(src);
}

function start(buf: AudioBuffer) {
  const c = getCtx();
  if (!c) return;
  // El contexto arranca "suspended" hasta que hay un gesto del usuario; el
  // borrado siempre lo es, así que esto desbloquea el audio sin romper la
  // política de autoplay.
  if (c.state === "suspended") void c.resume();
  const source = c.createBufferSource();
  source.buffer = buf;
  source.connect(c.destination);
  source.start(0);
}

export function playSound(src: string): void {
  if (getCtx() === null) return;
  const buf = buffers.get(src);
  if (buf) {
    start(buf);
    return;
  }
  // Todavía no estaba decodificado: lo cargamos y reproducimos al terminar.
  // Solo puede pasar la primera vez si no se llamó a preloadSound.
  void loadBuffer(src).then((b) => {
    if (b) start(b);
  });
}
