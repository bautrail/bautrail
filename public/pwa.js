(function() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && !location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch(error => console.log("Service Worker konnte nicht registriert werden.", error));
  });
})();
