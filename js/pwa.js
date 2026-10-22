/**
 * Регистрация Service Worker для офлайн работы PWA
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker зарегистрирован!', reg))
      .catch(err => console.error('Ошибка регистрации SW:', err));
  });
}