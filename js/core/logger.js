// Ruhige Konsole: Im Normalbetrieb werden Debug-Ausgaben (console.log/info/debug) unterdrückt.
// Warnungen und Fehler bleiben sichtbar. Zum Debuggen: ?debug=1 an die Adresse hängen
// oder in der Konsole localStorage.setItem('pelletTrackrDebug','1') setzen.
(function () {
  var debug = false;
  try { debug = /[?&]debug=1/.test(window.location.search) || window.localStorage.getItem('pelletTrackrDebug') === '1'; } catch (e) { /* ohne Speicher normal weiterlaufen */ }
  window.PELLET_DEBUG = debug;
  if (!debug) ['log', 'info', 'debug'].forEach(function (name) { console[name] = function () {}; });
})();
