/**
 * TransformGraph.js
 *
 * Displays a live preview graph of a REINVENT4 scoring transform.
 * Uses SVG (no external charting lib needed) for a lightweight render.
 */
import React from 'react';

const WIDTH = 380;
const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 32, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function lerp(v, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) return (outMin + outMax) / 2;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function formatNum(n) {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export default function TransformGraph({ xValues, yValues, xMin, xMax, label, color = "#007bff", loading }) {
  if (!xValues || !yValues || xValues.length === 0) {
    return (
      <div style={{
        width: WIDTH, height: HEIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8f9fa', borderRadius: 6, border: '1px solid #dee2e6',
        color: '#adb5bd', fontSize: '0.85rem'
      }}>
        {loading ? "Computing preview…" : "No preview available"}
      </div>
    );
  }

  const yMin = 0;
  const yMax = 1;

  // Build SVG path
  const points = xValues.map((x, i) => {
    const px = lerp(x, xMin, xMax, 0, PLOT_W);
    const py = lerp(yValues[i] ?? 0, yMin, yMax, PLOT_H, 0);
    return `${px.toFixed(2)},${py.toFixed(2)}`;
  });
  const pathD = "M " + points.join(" L ");

  // Fill area under curve
  const fillD = pathD
    + ` L ${PLOT_W.toFixed(2)},${PLOT_H.toFixed(2)}`
    + ` L 0,${PLOT_H.toFixed(2)} Z`;

  // Axis tick values
  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div style={{ userSelect: 'none' }}>
      {label && (
        <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: 4, textAlign: 'center' }}>
          {label}
        </div>
      )}
      <svg
        width={WIDTH}
        height={HEIGHT}
        style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id="tg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
          <clipPath id="tg-clip">
            <rect x="0" y="0" width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* Background */}
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H}
          fill="#f8f9fa" rx="3" />

        {/* Grid lines */}
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {yTicks.map(t => {
            const py = lerp(t, yMin, yMax, PLOT_H, 0);
            return (
              <g key={t}>
                <line x1={0} y1={py} x2={PLOT_W} y2={py}
                  stroke={t === 0.5 ? '#ced4da' : '#e9ecef'} strokeWidth={t === 0.5 ? 1.5 : 1}
                  strokeDasharray={t === 0.5 ? "4 2" : "none"} />
                <text x={-4} y={py + 4} textAnchor="end"
                  fontSize="9" fill="#868e96">{t.toFixed(2)}</text>
              </g>
            );
          })}

          {/* Fill */}
          <path d={fillD} fill="url(#tg-fill)" clipPath="url(#tg-clip)" />

          {/* Curve */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
            strokeLinejoin="round" clipPath="url(#tg-clip)" />

          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={PLOT_H} stroke="#adb5bd" strokeWidth="1" />
          <line x1={0} y1={PLOT_H} x2={PLOT_W} y2={PLOT_H} stroke="#adb5bd" strokeWidth="1" />

          {/* X ticks */}
          {xTicks.map((t, i) => {
            const px = lerp(t, xMin, xMax, 0, PLOT_W);
            return (
              <g key={i}>
                <line x1={px} y1={PLOT_H} x2={px} y2={PLOT_H + 4} stroke="#adb5bd" strokeWidth="1" />
                <text x={px} y={PLOT_H + 14} textAnchor="middle"
                  fontSize="9" fill="#868e96">{formatNum(t)}</text>
              </g>
            );
          })}
        </g>

        {/* Axis labels */}
        <text x={PAD.left + PLOT_W / 2} y={HEIGHT - 2}
          textAnchor="middle" fontSize="10" fill="#6c757d">
          Raw score (x)
        </text>
        <text
          transform={`rotate(-90,${PAD.left - 28},${PAD.top + PLOT_H / 2})`}
          x={PAD.left - 28} y={PAD.top + PLOT_H / 2}
          textAnchor="middle" fontSize="10" fill="#6c757d">
          Reward (y)
        </text>

        {loading && (
          <text x={PAD.left + PLOT_W / 2} y={PAD.top + PLOT_H / 2}
            textAnchor="middle" fontSize="11" fill="#adb5bd">
            Updating…
          </text>
        )}
      </svg>
    </div>
  );
}
