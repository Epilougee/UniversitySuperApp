'use client';

import React, { useEffect, useRef } from 'react';

export default function Chalkboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const board = containerRef.current;
    if (!board) return;

    board.innerHTML = '';

    const iconTypes = [
      'fa-flask', 'fa-calculator', 'fa-book-open', 'fa-atom',
      'fa-database', 'fa-code', 'fa-microchip', 'fa-brain',
      'fa-graduation-cap', 'fa-globe', 'fa-terminal', 'fa-shield-halved',
      'fa-gear', 'fa-network-wired', 'fa-chart-line', 'fa-shapes',
    ];

    const rows = 12;
    const cols = 14;
    let w = window.innerWidth;
    let h = window.innerHeight;

    interface IconItem {
      el: HTMLElement;
      origX: number;
      origY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      active: boolean;
    }

    const iconData: IconItem[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const icon = document.createElement('i');
        const iconClass = iconTypes[Math.floor(Math.random() * iconTypes.length)];
        icon.className = `fa-solid ${iconClass} chalk-icon`;
        const xPct = (c * (100 / cols)) + (Math.random() * 5);
        const yPct = (r * (100 / rows)) + (Math.random() * 5);
        icon.style.left = `${xPct}%`;
        icon.style.top = `${yPct}%`;
        icon.style.fontSize = `${18 + Math.random() * 20}px`;
        icon.style.opacity = '0.35';
        board.appendChild(icon);
        iconData.push({
          el: icon,
          origX: (xPct / 100) * w,
          origY: (yPct / 100) * h,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          active: false,
        });
      }
    }

    let mX = -1000;
    let mY = -1000;
    let animRunning = false;
    let animationFrameId: number;

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      iconData.forEach((item) => {
        item.origX = (parseFloat(item.el.style.left) / 100) * w;
        item.origY = (parseFloat(item.el.style.top) / 100) * h;
      });
    };

    const animate = () => {
      let anyMoving = false;
      const radius = 200;
      const radiusSq = radius * radius;

      for (let i = 0; i < iconData.length; i++) {
        const item = iconData[i];
        const icX = item.origX + item.x;
        const icY = item.origY + item.y;
        const dx = mX - icX;
        const dy = mY - icY;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const force = (radius - dist) / radius;
          const angle = Math.atan2(dy, dx);
          item.vx -= Math.cos(angle) * force * 5;
          item.vy -= Math.sin(angle) * force * 5;
          if (!item.active) {
            item.active = true;
            item.el.style.color = 'rgba(180, 180, 255, 0.95)';
            item.el.style.opacity = '1';
            item.el.style.filter = 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.9))';
          }
        } else if (item.active) {
          item.active = false;
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

        if (Math.abs(item.vx) > 0.05 || Math.abs(item.vy) > 0.05 || Math.abs(item.x) > 0.1 || Math.abs(item.y) > 0.1) {
          anyMoving = true;
          item.el.style.transform = `translate3d(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px, 0)`;
        } else if (item.x !== 0 || item.y !== 0) {
          item.x = 0;
          item.y = 0;
          item.vx = 0;
          item.vy = 0;
          item.el.style.transform = '';
        }
      }

      if (anyMoving) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        animRunning = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mX = e.clientX;
      mY = e.clientY;
      if (!animRunning) {
        animRunning = true;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <div id="chalkboard" ref={containerRef} aria-hidden="true" />;
}
