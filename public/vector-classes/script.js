/* ==========================================================================
   Vector Classes Barhi — JavaScript Interactions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Vector Classes Barhi Website Loaded');

    // Smooth Scroll for Nav Links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});
