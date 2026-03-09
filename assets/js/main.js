// Mobile nav toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var body   = document.body;

  if (!toggle) return;

  toggle.addEventListener('click', function () {
    body.classList.toggle('nav-open');
    var expanded = body.classList.contains('nav-open');
    toggle.setAttribute('aria-expanded', expanded);
  });

  // Close nav when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', function () {
      body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();
