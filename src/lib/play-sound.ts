// Utilidad mínima para reproducir efectos de sonido en el cliente.
// Cachea una instancia de Audio por `src` para no recrearla en cada uso y
// reinicia `currentTime` para poder dispararla en rápida sucesión.
const cache = new Map<string, HTMLAudioElement>();

export function playSound(src: string) {
  if (typeof Audio === "undefined") return;
  let audio = cache.get(src);
  if (!audio) {
    audio = new Audio(src);
    cache.set(src, audio);
  }
  audio.currentTime = 0;
  // Si el navegador bloquea la reproducción, no rompemos el flujo de borrado.
  void audio.play().catch(() => {});
}
