// Sayfa çizilmeden önce kayıtlı temayı uygular (gece haritası seçiliyken gündüz haritasının bir an yanıp sönmemesi için).
try {
  if (JSON.parse(localStorage.getItem('weather-settings'))?.theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
} catch {
  // Depolama kapalıysa varsayılan gündüz haritası kalır
}