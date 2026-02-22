// JavaScript logic for Dion Group Homepage

document.addEventListener('DOMContentLoaded', () => {

  // === 3D Tilt effect for glass panels ===
  const cards = document.querySelectorAll('.glass-panel:not(.disabled)');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateX = (y / rect.height) * -10;
      const rotateY = (x / rect.width) * 10;
      card.style.transform = `perspective(1000px) translateY(-8px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // === Scroll Reveal Animation (Intersection Observer) ===
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Only animate once so it stays visible
      }
    });
  }, {
    root: null,
    threshold: 0.15, // Trigger when 15% of element is visible
    rootMargin: "0px 0px -50px 0px"
  });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

});
