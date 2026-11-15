'use client';

import React, { useEffect, useRef } from 'react';

export default function Chalkboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const board = containerRef.current;
    if (!board) return;

    // Clear any previous icons
    board.innerHTML = '';

    const iconTypes = [
      'fa-flask', 'fa-calculator', 'fa-book-open', 'fa-atom',
      'fa-database', 'fa-code', 'fa-microchip', 'fa-brain',
      'fa-graduation-cap', 'fa-globe', 'fa-terminal', 'fa-shield-halved',
      'fa-gear', 'fa-network-wired', 'fa-chart-line', 'fa-shapes',
    ];

    const rows = 12;
    const cols = 14;
    const iconData: { el: HTMLElement; x: number; y: number; vx: number; vy: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const icon = document.createElement('i');
        const iconClass = iconTypes[Math.floor(Math.random() * iconTypes.length)];
        icon.className = `fa-solid ${iconClass} chalk-icon`;
        icon.style.left = `${c * (100 / cols) + Math.random() * 5}%`;
        icon.style.top = `${r * (100 / rows) + Math.random() * 5}%`;
        icon.style.fontSize = `${18 + Math.random() * 20}px`;
        icon.style.opacity = '0.35';
        board.appendChild(icon);
        iconData.push({ el: icon, x: 0, y: 0, vx: 0, vy: 0 });
      }
    }

    let mX = window.innerWidth / 2;
    let mY = window.innerHeight / 2;

    const onMouseMove = (e: MouseEvent) => {
      mX = e.clientX;
      mY = e.clientY;
    };

    window.addEventListener('mousemove', onMouseMove);

    let animationFrameId: number;

    const animate = () => {
      iconData.forEach((item) => {
        const rect = item.el.getBoundingClientRect();
        const icX = rect.left + rect.width / 2;
        const icY = rect.top + rect.height / 2;
        const dx = mX - icX;
        const dy = mY - icY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          const angle = Math.atan2(dy, dx);
          const force = (200 - dist) / 200;
          item.vx -= Math.cos(angle) * force * 5;
          item.vy -= Math.sin(angle) * force * 5;
          item.el.style.color = 'rgba(180, 180, 255, 0.95)';
          item.el.style.opacity = '1';
          item.el.style.filter = 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.9))';
        } else {
          item.el.style.color = 'rgba(255, 255, 255, 0.35)';
          item.el.style.opacity = '0.35';
          item.el.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.1))';
        }

        item.vx *= 0.9;
        item.vy *= 0.9;
        item.x += item.vx;
        item.y += item.vy;
        item.x *= 0.95;
        item.y *= 0.95;
        item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <div id="chalkboard" ref={containerRef} aria-hidden="true" />;
}
