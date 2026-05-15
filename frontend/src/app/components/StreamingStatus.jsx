// Displayed while SSE stream is in progress.
// Parent controls visibility — rendered only when status === 'loading'.
export default function StreamingStatus() {
  // TODO: optionally cycle through messages every ~5s to show progress:
  //   "Analizuję CV..." → "Szukam braków..." → "Przepisuję bullet pointy..."

  return (
    <div className="mt-8 flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      <span className="text-sm">Analizuję... to zajmie około 20–30 sekund</span>
    </div>
  );
}
