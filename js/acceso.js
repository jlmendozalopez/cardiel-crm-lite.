/* Pantalla de acceso. Por ahora solo hay entrada como invitado; la sesión dura lo que la pestaña del navegador. */
window.CRM = window.CRM || {};

(function (CRM) {
  "use strict";

  const CLAVE = "cardiel_sesion";
  const raiz = document.documentElement;
  const el = document.getElementById("acceso");

  el.innerHTML = `
    <section class="acceso-marca" aria-hidden="true">
      <div class="acceso-escena">
        <img class="acceso-portada" src="assets/portada-cardiel.png" alt="">
      </div>
      <div class="acceso-camino"></div>
    </section>
    <section class="acceso-panel">
      <div class="acceso-entrada">
        <img class="acceso-logo-claro" src="assets/logo-cardiel.png" alt="CARDIEL">
        <h1>Portal comercial</h1>
        <p>Clientes, cotizaciones y el Cerebro Digital para identificar refacciones de tractocamiones, remolques y dollies.</p>
        <button class="btn btn-pri btn-acceso" id="btn-invitado" type="button">Entrar como invitado</button>
        <p class="acceso-ayuda">¿Necesitas ayuda? Comercialización y Servicio<br><a href="tel:+525549822934">(55) 4982 2934</a></p>
      </div>
      <footer class="acceso-pie">© ${new Date().getFullYear()} CARDIEL Trailers de México, S.A. de C.V.</footer>
    </section>`;

  const btn = document.getElementById("btn-invitado");

  btn.addEventListener("click", () => {
    try { sessionStorage.setItem(CLAVE, "invitado"); } catch (e) { /* sin almacenamiento */ }
    el.classList.add("sale");
    raiz.classList.remove("sin-sesion");
    window.scrollTo(0, 0);
    setTimeout(() => el.classList.remove("sale"), 320);
  });

  CRM.salir = () => {
    try { sessionStorage.removeItem(CLAVE); } catch (e) { /* */ }
    raiz.classList.add("sin-sesion");
    location.hash = "#/inicio";
    btn.focus();
  };

  if (raiz.classList.contains("sin-sesion")) btn.focus();
})(window.CRM);
