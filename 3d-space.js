/* ==================================================================
   X00716 NEXUS ENTERPRISE — High-Performance 3D Space Canvas Engine
   ================================================================== */

(function () {
    'use strict';

    const canvas = document.getElementById('space-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;

    // Optical Spectrum & Density Matrix
    const SPECTRUM = ['#00FFFF', '#C026D3', '#00FF88', '#FF0080', '#FFD700'];
    const IS_MOBILE = window.innerWidth < 768;
    const STAR_COUNT = IS_MOBILE ? 85 : 190;
    const DUST_COUNT = IS_MOBILE ? 25 : 55;
    const CONNECTION_LIMIT = IS_MOBILE ? 90 : 140;

    let stars = [];
    let dustParticles = [];
    let meteors = [];
    let shockwaves = [];

    // Ambient Electromagnetic Flash (Subtle Nebula Lightning)
    const nebulaFlash = {
        alpha: 0,
        targetAlpha: 0,
        color: '#00FFFF',
        nextTrigger: Date.now() + 6000
    };

    // Parallax Tilt & Dynamics
    const mouse = { x: -9999, y: -9999, active: false, radius: 160 };
    const tilt = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initStars();
        initDust();
    }

    // 1. Deep 3D Celestial Stars
    function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: (Math.random() - 0.5) * width * 2,
                y: (Math.random() - 0.5) * height * 2,
                z: Math.random() * 1000 + 50,
                baseZ: Math.random() * 1000 + 50,
                size: Math.random() * 1.5 + 0.6,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.025 + 0.008,
                color: Math.random() > 0.35 ? '#ffffff' : (Math.random() > 0.5 ? '#00FFFF' : '#C026D3')
            });
        }
    }

    // 2. Interactive Foreground Neon Dust Network
    function initDust() {
        dustParticles = [];
        for (let i = 0; i < DUST_COUNT; i++) {
            const depth = Math.random() * 0.8 + 0.3;
            dustParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                z: depth,
                vx: (Math.random() - 0.5) * 0.35 * depth,
                vy: (Math.random() - 0.5) * 0.35 * depth,
                radius: (Math.random() * 2 + 1) * depth,
                color: SPECTRUM[Math.floor(Math.random() * SPECTRUM.length)],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.03 + 0.015
            });
        }
    }

    // 3. Cosmic Meteor Trajectories
    function spawnMeteor() {
        if (meteors.length >= 2) return;
        const startX = Math.random() * width * 1.2;
        const startY = -40;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.22;
        const speed = Math.random() * 11 + 10;

        meteors.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            length: Math.random() * 90 + 70,
            alpha: 1.0,
            color: Math.random() > 0.5 ? '#00FFFF' : '#FF0080'
        });
    }

    // 4. Kinetic Shockwave Impulse
    function triggerShockwave(x, y) {
        shockwaves.push({
            x, y,
            radius: 6,
            maxRadius: IS_MOBILE ? 150 : 230,
            alpha: 0.9,
            speed: 7,
            color: SPECTRUM[Math.floor(Math.random() * SPECTRUM.length)]
        });

        dustParticles.forEach(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.hypot(dx, dy);
            if (dist < 220 && dist > 1) {
                const force = ((220 - dist) / 220) * 8.5;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        });
    }

    let lastTime = 0;
    const FRAME_RATE_LIMIT = 1000 / 60;
    let nextMeteorTime = Date.now() + Math.random() * 7000 + 4000;

    // 60 FPS Render Loop Pipeline
    function render(currentTime) {
        requestAnimationFrame(render);

        const delta = currentTime - lastTime;
        if (delta < FRAME_RATE_LIMIT) return;
        lastTime = currentTime;

        ctx.clearRect(0, 0, width, height);

        // Smooth Tilt Interpolation
        tilt.currentX += (tilt.targetX - tilt.currentX) * 0.05;
        tilt.currentY += (tilt.targetY - tilt.currentY) * 0.05;

        // A. Subtle Distant Cosmic Lightning / Nebula Flash
        if (Date.now() > nebulaFlash.nextTrigger) {
            nebulaFlash.targetAlpha = 0.038;
            nebulaFlash.color = Math.random() > 0.5 ? '#00FFFF' : '#C026D3';
            nebulaFlash.nextTrigger = Date.now() + Math.random() * 12000 + 8000;
        }
        nebulaFlash.alpha += (nebulaFlash.targetAlpha - nebulaFlash.alpha) * 0.08;
        if (nebulaFlash.targetAlpha > 0 && nebulaFlash.alpha >= 0.035) {
            nebulaFlash.targetAlpha = 0;
        }

        if (nebulaFlash.alpha > 0.005) {
            ctx.fillStyle = nebulaFlash.color;
            ctx.globalAlpha = nebulaFlash.alpha;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }

        // B. Deep 3D Stars Floating In Spatial Z-Depth
        const cx = width / 2;
        const cy = height / 2;

        stars.forEach(star => {
            star.z -= 0.65;
            if (star.z <= 10) {
                star.z = 1000;
                star.x = (Math.random() - 0.5) * width * 2;
                star.y = (Math.random() - 0.5) * height * 2;
            }

            const k = 420 / star.z;
            const px = star.x * k + cx + tilt.currentX * 1.6;
            const py = star.y * k + cy + tilt.currentY * 1.6;

            if (px >= 0 && px <= width && py >= 0 && py <= height) {
                star.twinkle += star.twinkleSpeed;
                const brightness = Math.max(0.2, Math.min(1.0, (1 - star.z / 1000) * (0.65 + Math.sin(star.twinkle) * 0.35)));
                ctx.fillStyle = star.color;
                ctx.globalAlpha = brightness;
                ctx.beginPath();
                ctx.arc(px, py, Math.max(0.65, star.size * k * 0.75), 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.globalAlpha = 1.0;

        // C. Rare Passing Shooting Meteors
        if (Date.now() > nextMeteorTime) {
            spawnMeteor();
            nextMeteorTime = Date.now() + Math.random() * 9000 + 5000;
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.alpha -= 0.015;

            if (m.alpha <= 0 || m.x > width + 100 || m.y > height + 100) {
                meteors.splice(i, 1);
                continue;
            }

            const tailX = m.x - m.vx * (m.length / 18);
            const tailY = m.y - m.vy * (m.length / 18);

            const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
            grad.addColorStop(0, m.color);
            grad.addColorStop(1, 'transparent');

            ctx.save();
            ctx.globalAlpha = m.alpha * 0.75;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
            ctx.restore();
        }

        // D. Constellation Interlinkage
        for (let i = 0; i < dustParticles.length; i++) {
            const p1 = dustParticles[i];
            for (let j = i + 1; j < dustParticles.length; j++) {
                const p2 = dustParticles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.hypot(dx, dy);

                if (dist < CONNECTION_LIMIT) {
                    const alpha = (1 - dist / CONNECTION_LIMIT) * 0.28 * Math.min(p1.z, p2.z);
                    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
                    ctx.lineWidth = 0.75 * Math.min(p1.z, p2.z);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        // E. Dust Dynamics & Cursor Repulsion
        dustParticles.forEach(p => {
            p.pulse += p.pulseSpeed;

            if (mouse.active) {
                const mdx = p.x - mouse.x;
                const mdy = p.y - mouse.y;
                const mdist = Math.hypot(mdx, mdy);
                if (mdist < mouse.radius && mdist > 0.1) {
                    const mforce = (mouse.radius - mdist) / mouse.radius;
                    p.vx += (mdx / mdist) * mforce * 0.6 * p.z;
                    p.vy += (mdy / mdist) * mforce * 0.6 * p.z;
                }
            }

            p.x += p.vx + tilt.currentX * p.z * 0.35;
            p.y += p.vy + tilt.currentY * p.z * 0.35;
            p.vx *= 0.985;
            p.vy *= 0.985;

            if (Math.abs(p.vx) < 0.08) p.vx += (Math.random() - 0.5) * 0.04;
            if (Math.abs(p.vy) < 0.08) p.vy += (Math.random() - 0.5) * 0.04;

            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > width) { p.x = width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            if (p.y > height) { p.y = height; p.vy *= -1; }

            const currentRadius = p.radius * (1 + Math.sin(p.pulse) * 0.2);

            ctx.beginPath();
            ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 14 * p.z;
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        });

        // F. Expanding Impulse Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha -= 0.022;

            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = sw.alpha;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 18;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Input Listeners Pipeline
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;

        tilt.targetX = (e.clientX / width - 0.5) * 4;
        tilt.targetY = (e.clientY / height - 0.5) * 4;

        const orbs = document.querySelectorAll('.orb');
        orbs.forEach((orb, idx) => {
            const factor = (idx % 2 === 0 ? -1 : 1) * (10 + idx * 4);
            orb.style.transform = `translate(${tilt.targetX * factor}px, ${tilt.targetY * factor}px)`;
        });
    });

    window.addEventListener('mouseleave', () => {
        mouse.active = false;
        tilt.targetX = 0;
        tilt.targetY = 0;
    });

    window.addEventListener('click', e => {
        if (e.target.closest('.modal-bd') || e.target.closest('button') || e.target.closest('.inp') || e.target.closest('.drawer')) {
            return;
        }
        triggerShockwave(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', e => {
        if (e.touches[0]) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
            mouse.active = true;
            tilt.targetX = (mouse.x / width - 0.5) * 4;
            tilt.targetY = (mouse.y / height - 0.5) * 4;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        mouse.active = false;
        tilt.targetX = 0;
        tilt.targetY = 0;
    });

    // Boot 3D Engine
    resize();
    requestAnimationFrame(render);
})();
