"use client";

import React, { useEffect, useRef } from "react";

interface Hub {
  name: string;
  lat: number;
  lng: number;
  symbol: string;
}

const HUBS: Hub[] = [
  { name: 'Beijing', lat: 39.9, lng: 116.4, symbol: 'CNY' },
  { name: 'New York', lat: 40.7, lng: -74.0, symbol: 'USD' },
  { name: 'London', lat: 51.5, lng: -0.1, symbol: 'GBP' },
  { name: 'Tokyo', lat: 35.7, lng: 139.7, symbol: 'JPY' },
  { name: 'Frankfurt', lat: 50.1, lng: 8.7, symbol: 'EUR' },
  { name: 'Singapore', lat: 1.35, lng: 103.8, symbol: 'SGD' },
  { name: 'Sydney', lat: -33.9, lng: 151.2, symbol: 'AUD' },
  { name: 'Hong Kong', lat: 22.3, lng: 114.2, symbol: 'HKD' },
];

const CONNECTIONS = [
  { from: 'Beijing', to: 'New York' },
  { from: 'New York', to: 'London' },
  { from: 'London', to: 'Frankfurt' },
  { from: 'Frankfurt', to: 'Beijing' },
  { from: 'Beijing', to: 'Singapore' },
  { from: 'Singapore', to: 'Tokyo' },
  { from: 'Tokyo', to: 'New York' },
  { from: 'Singapore', to: 'Sydney' },
  { from: 'Hong Kong', to: 'London' },
  { from: 'Hong Kong', to: 'Beijing' },
];

export default function GlobeBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ yaw: 0, pitch: 0.2 });
  const targetRotationRef = useRef({ yaw: 0, pitch: 0.2 });
  const mouseRef = useRef({ x: 0, y: 0 });

  // Handle pointer interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Small shift depending on mouse position
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 0.4,
        y: (e.clientY / window.innerHeight - 0.5) * 0.4,
      };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let particles: { pathIndex: number; progress: number; speed: number }[] = [];

    // Initialize random interactive particles along the connection arches
    for (let i = 0; i < 12; i++) {
      particles.push({
        pathIndex: Math.floor(Math.random() * CONNECTIONS.length),
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
      });
    }

    // Generate latitude/longitude grid dots
    const gridPoints: { lat: number; lng: number }[] = [];
    const latSteps = 24;
    const lngSteps = 36;
    for (let i = 1; i < latSteps; i++) {
      const lat = -90 + (180 / latSteps) * i;
      for (let j = 0; j < lngSteps; j++) {
        const lng = -180 + (360 / lngSteps) * j;
        gridPoints.push({ lat, lng });
      }
    }

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth * dpr : window.innerWidth * dpr;
      canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight * dpr : window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Coordinate conversion formulas: Spherical to Cartesian 3D
    const latLngToCartesian = (lat: number, lng: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);

      return {
        x: -(radius * Math.sin(phi) * Math.sin(theta)),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.cos(theta),
      };
    };

    // 3D rotation projection helper
    const project = (
      x: number,
      y: number,
      z: number,
      yaw: number,
      pitch: number,
      radius: number,
      centerX: number,
      centerY: number
    ) => {
      // Rotation around Y axis (Yaw)
      let rX = x * Math.cos(yaw) - z * Math.sin(yaw);
      let rZ = x * Math.sin(yaw) + z * Math.cos(yaw);

      // Rotation around X axis (Pitch)
      let rY = y * Math.cos(pitch) - rZ * Math.sin(pitch);
      let zD = y * Math.sin(pitch) + rZ * Math.cos(pitch);

      // Simple orthographic projection with depth cues
      const factor = 1.0; 
      return {
        px: centerX + rX * factor,
        py: centerY - rY * factor,
        depth: zD, // Distance along depth axis
        visible: zD > -10, // Depth clipping
      };
    };

    // Render loop
    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      // Fixed centered globe
      const globeRadius = Math.min(width, height) * 0.35;
      const centerX = width * 0.85;
      const centerY = height * 0.45;

      // Base rotation + scroll parallax adjustments + mouse response
      targetRotationRef.current.yaw += 0.0015;
      rotationRef.current.yaw = targetRotationRef.current.yaw + mouseRef.current.x;
      rotationRef.current.pitch = 0.2 + mouseRef.current.y;

      const { yaw, pitch } = rotationRef.current;

      // Draw background space stars/dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let i = 0; i < 20; i++) {
        // Static starry texture
        const sx = (Math.sin(i * 1032) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 6842) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw planetary boundary atmospheric circles
      const glowGrad = ctx.createRadialGradient(centerX, centerY, globeRadius * 0.8, centerX, centerY, globeRadius * 1.5);
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.0)');
      glowGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.03)');
      glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw simple ring representing Orbit / Block connection
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, globeRadius * 1.3, globeRadius * 0.4, -0.3, 0, Math.PI * 2);
      ctx.stroke();

      // 1. Draw back hemisphere dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      gridPoints.forEach((pt) => {
        const c = latLngToCartesian(pt.lat, pt.lng, globeRadius);
        const p = project(c.x, c.y, c.z, yaw, pitch, globeRadius, centerX, centerY);
        if (p.depth < 0) {
          // Point is on the back side
          ctx.beginPath();
          ctx.arc(p.px, p.py, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 2. Draw connections (Aesthetic Bezier curves in 3D projection)
      CONNECTIONS.forEach((conn) => {
        const fromHub = HUBS.find((h) => h.name === conn.from);
        const toHub = HUBS.find((h) => h.name === conn.to);
        if (!fromHub || !toHub) return;

        const c1 = latLngToCartesian(fromHub.lat, fromHub.lng, globeRadius);
        const c2 = latLngToCartesian(toHub.lat, toHub.lng, globeRadius);

        const p1 = project(c1.x, c1.y, c1.z, yaw, pitch, globeRadius, centerX, centerY);
        const p2 = project(c2.x, c2.y, c2.z, yaw, pitch, globeRadius, centerX, centerY);

        // Render connection line only if both endpoints projected reasonably
        if (p1.visible && p2.visible) {
          // Calculate curve control point pulled outward from Earth center to form elegant arch
          const midX = (p1.px + p2.px) / 2;
          const midY = (p1.py + p2.py) / 2;

          // Push control point away from center
          const dx = midX - centerX;
          const dy = midY - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = 0.4 + (globeRadius - dist) * 0.001; // dynamically adapt arch weight

          const ctrlX = midX + (dx / (dist || 1)) * globeRadius * pull;
          const ctrlY = midY + (dy / (dist || 1)) * globeRadius * pull;

          // Check if path is mostly facing us
          const avgDepth = (p1.depth + p2.depth) / 2;
          const lineAlpha = avgDepth > 0 ? 0.22 : 0.06;

          // Streamline gradient
          const lineGrad = ctx.createLinearGradient(p1.px, p1.py, p2.px, p2.py);
          lineGrad.addColorStop(0, `rgba(52, 211, 153, ${lineAlpha})`);
          lineGrad.addColorStop(0.5, `rgba(147, 51, 234, ${lineAlpha * 1.3})`); // Purple networking intersection
          lineGrad.addColorStop(1, `rgba(16, 185, 129, ${lineAlpha})`);

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.quadraticCurveTo(ctrlX, ctrlY, p2.px, p2.py);
          ctx.stroke();
        }
      });

      // 3. Draw grid dots on the front hemisphere
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)'; // cyber emerald dots
      gridPoints.forEach((pt) => {
        const c = latLngToCartesian(pt.lat, pt.lng, globeRadius);
        const p = project(c.x, c.y, c.z, yaw, pitch, globeRadius, centerX, centerY);
        if (p.depth >= 0) {
          // Dynamic glow based on latitude mapping
          const depthMultiplier = (p.depth + globeRadius) / (globeRadius * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${0.1 + depthMultiplier * 0.35})`;
          ctx.beginPath();
          ctx.arc(p.px, p.py, 1.1 + depthMultiplier * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Draw Traveling Data Packets/Particles
      particles.forEach((part) => {
        const conn = CONNECTIONS[part.pathIndex];
        const fromHub = HUBS.find((h) => h.name === conn.from);
        const toHub = HUBS.find((h) => h.name === conn.to);
        if (!fromHub || !toHub) return;

        const c1 = latLngToCartesian(fromHub.lat, fromHub.lng, globeRadius);
        const c2 = latLngToCartesian(toHub.lat, toHub.lng, globeRadius);

        const p1 = project(c1.x, c1.y, c1.z, yaw, pitch, globeRadius, centerX, centerY);
        const p2 = project(c2.x, c2.y, c2.z, yaw, pitch, globeRadius, centerX, centerY);

        const avgDepth = (p1.depth + p2.depth) / 2;
        if (avgDepth > -20) {
          // Compute bezier coordinate at current particle progress
          const t = part.progress;
          const midX = (p1.px + p2.px) / 2;
          const midY = (p1.py + p2.py) / 2;
          const dx = midX - centerX;
          const dy = midY - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = 0.4 + (globeRadius - dist) * 0.001;

          const ctrlX = midX + (dx / (dist || 1)) * globeRadius * pull;
          const ctrlY = midY + (dy / (dist || 1)) * globeRadius * pull;

          // Quadratic bezier interpolation formula
          const px = (1 - t) * (1 - t) * p1.px + 2 * (1 - t) * t * ctrlX + t * t * p2.px;
          const py = (1 - t) * (1 - t) * p1.py + 2 * (1 - t) * t * ctrlY + t * t * p2.py;

          // Pulse animation particle
          const pulseZ = avgDepth > 0 ? 1 : 0.4;
          ctx.fillStyle = '#34D399';
          ctx.beginPath();
          ctx.arc(px, py, 2.2 * pulseZ, 0, Math.PI * 2);
          ctx.fill();

          // Add elegant tail/pulse ring
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(px, py, 4.5 * pulseZ, 0, Math.PI * 2);
          ctx.stroke();

          // Update particle progress
          part.progress += part.speed;
          if (part.progress >= 1.0) {
            part.progress = 0;
            part.pathIndex = Math.floor(Math.random() * CONNECTIONS.length);
          }
        }
      });

      // 5. Drawing major financial centers/hubs with labeled markers
      HUBS.forEach((hub) => {
        const c = latLngToCartesian(hub.lat, hub.lng, globeRadius);
        const p = project(c.x, c.y, c.z, yaw, pitch, globeRadius, centerX, centerY);

        if (p.depth >= -10) {
          const depthMultiplier = (p.depth + globeRadius) / (globeRadius * 2);
          const baseAlpha = 0.2 + depthMultiplier * 0.8;

          // Draw active hub spot
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(p.px, p.py, 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Draw glowing aura ring
          ctx.strokeStyle = `rgba(16, 185, 129, ${baseAlpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.px, p.py, 5.5 + Math.sin(Date.now() * 0.003 + hub.lat) * 2, 0, Math.PI * 2);
          ctx.stroke();

          // Text metrics and placement
          if (p.depth > globeRadius * 0.2) {
            ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha * 0.85})`;
            ctx.font = '500 9px Inter, sans-serif';
            ctx.fillText(`${hub.name} (${hub.symbol})`, p.px + 9, p.py + 3);

            // Tech coordinate tick line
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p.px + 5, p.py - 5);
            ctx.stroke();
          }
        }
      });

      // Simple grid radar overlay at bottom section of the background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      id="globe-background-canvas"
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 block bg-transparent"
      style={{ willChange: 'transform' }}
    />
  );
}
