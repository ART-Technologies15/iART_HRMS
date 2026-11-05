import React, { useMemo } from "react";
import { createPortal } from "react-dom";

export const SCENE_MS = 1800;

const makeStars = () => {
    let seed = 11;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
    return Array.from({ length: 48 }, () => ({
        x: rand() * 1600,
        y: rand() * 480,
        r: 0.6 + rand() * 2,
        delay: rand() * 2,
    }));
};
const STARS = makeStars();

/** Local time → greeting + short tagline */
function getTimeCopy(sceneType) {
    const hour = new Date().getHours();

    // Prefer real clock; fall back to scene type only if you want
    if (hour >= 5 && hour < 12) {
        return {
            title: "Good morning",
            line:
                sceneType === "sunrise"
                    ? "A brighter workspace is on its way"
                    : "Ease into a calmer view",
        };
    }
    if (hour >= 12 && hour < 17) {
        return {
            title: "Good afternoon",
            line:
                sceneType === "sunrise"
                    ? "Clear skies for focused work"
                    : "Soft light when you need it",
        };
    }
    if (hour >= 17 && hour < 21) {
        return {
            title: "Good evening",
            line:
                sceneType === "sunset"
                    ? "Winding down for the night"
                    : "Still plenty of light left",
        };
    }
    // 21:00 – 04:59
    return {
        title: "Good night",
        line:
            sceneType === "sunset"
                ? "Rest easy — dark mode is ready"
                : "Quiet hours, gentle light",
    };
}

const css = `
.ts-root{
  position:fixed; inset:0; z-index:9999; overflow:hidden;
  pointer-events:all; cursor:progress;
  --d:${SCENE_MS}ms;
  animation: ts-veil var(--d) cubic-bezier(.4,0,.2,1) both;
}
.ts-svg{ position:absolute; inset:0; width:100%; height:100%; display:block; }

@keyframes ts-veil{
  0%{ opacity:0; transform:scale(1.04) }
  12%{ opacity:1; transform:scale(1) }
  78%{ opacity:1; transform:scale(1) }
  100%{ opacity:0; transform:scale(1.02) }
}

.ts-rise .ts-dawn{ animation: ts-dawn-in var(--d) linear both }
.ts-rise .ts-day { animation: ts-day-in  var(--d) linear both }
.ts-set  .ts-day { animation: ts-day-out var(--d) linear both }
.ts-set  .ts-dawn{ animation: ts-dusk-out var(--d) linear both }
@keyframes ts-dawn-in { 0%,10%{opacity:0} 40%,100%{opacity:1} }
@keyframes ts-day-in  { 0%,42%{opacity:0} 78%,100%{opacity:1} }
@keyframes ts-day-out { 0%,15%{opacity:1} 50%,100%{opacity:0} }
@keyframes ts-dusk-out{ 0%,55%{opacity:1} 88%,100%{opacity:0} }

.ts-glow{ opacity:0 }
.ts-rise .ts-glow{ animation: ts-glow-rise var(--d) ease-in-out both }
.ts-set  .ts-glow{ animation: ts-glow-set  var(--d) ease-in-out both }
@keyframes ts-glow-rise{ 0%,12%{opacity:0} 42%{opacity:1} 88%,100%{opacity:0} }
@keyframes ts-glow-set { 0%,18%{opacity:0} 48%{opacity:1} 88%,100%{opacity:0} }

.ts-sun{ will-change: transform }
.ts-rise .ts-sun{ animation: ts-sun-rise var(--d) cubic-bezier(.22,.7,.28,1) both }
.ts-set  .ts-sun{ animation: ts-sun-set  var(--d) cubic-bezier(.55,.1,.7,.4) both }
@keyframes ts-sun-rise{
  0%{ transform: translate(0, 420px) scale(.55) }
  70%{ transform: translate(0, -20px) scale(1) }
  100%{ transform: translate(0, -55px) scale(1.05) }
}
@keyframes ts-sun-set{
  0%{ transform: translate(0, -55px) scale(1.05) }
  35%{ transform: translate(0, -10px) scale(1) }
  100%{ transform: translate(0, 430px) scale(.5) }
}

.ts-rise .ts-sun-core{ animation: ts-core-rise var(--d) linear both }
.ts-set  .ts-sun-core{ animation: ts-core-set  var(--d) linear both }
@keyframes ts-core-rise{ 0%{fill:#ff5a28} 45%{fill:#ffb347} 100%{fill:#fff3b0} }
@keyframes ts-core-set { 0%{fill:#fff3b0} 40%{fill:#ffc56b} 100%{fill:#ff4d2a} }

.ts-rise .ts-sun-halo{ animation: ts-halo-rise var(--d) linear both }
.ts-set  .ts-sun-halo{ animation: ts-halo-set  var(--d) linear both }
@keyframes ts-halo-rise{ 0%{opacity:.15; transform:scale(.7)} 100%{opacity:1; transform:scale(1)} }
@keyframes ts-halo-set { 0%{opacity:1; transform:scale(1)} 100%{opacity:.12; transform:scale(.75)} }

.ts-rise .ts-moon{ animation: ts-moon-out var(--d) ease-in both }
.ts-set  .ts-moon{ animation: ts-moon-in  var(--d) ease-out both }
@keyframes ts-moon-out{
  0%{ opacity:1; transform: translateY(0) scale(1) }
  40%,100%{ opacity:0; transform: translateY(60px) scale(.85) }
}
@keyframes ts-moon-in{
  0%,40%{ opacity:0; transform: translateY(60px) scale(.85) }
  100%{ opacity:1; transform: translateY(0) scale(1) }
}

.ts-rise .ts-stars{ animation: ts-stars-out var(--d) linear both }
.ts-set  .ts-stars{ animation: ts-stars-in  var(--d) linear both }
@keyframes ts-stars-out{ 0%,15%{opacity:1} 48%,100%{opacity:0} }
@keyframes ts-stars-in { 0%,45%{opacity:0} 85%,100%{opacity:1} }
.ts-star{ animation: ts-twinkle 1.8s ease-in-out infinite }
@keyframes ts-twinkle{ 0%,100%{opacity:.3} 50%{opacity:1} }

.ts-cloud{ fill:#fff }
.ts-rise .ts-clouds{ animation: ts-clouds-in  var(--d) linear both }
.ts-set  .ts-clouds{ animation: ts-clouds-out var(--d) linear both }
@keyframes ts-clouds-in { 0%{opacity:.05} 80%,100%{opacity:.9} }
@keyframes ts-clouds-out{ 0%,12%{opacity:.9} 80%,100%{opacity:.06} }
.ts-cloud-a{ animation: ts-drift-a 5.5s ease-in-out infinite alternate }
.ts-cloud-b{ animation: ts-drift-b 7s ease-in-out infinite alternate }
.ts-cloud-c{ animation: ts-drift-c 6.2s ease-in-out infinite alternate }
@keyframes ts-drift-a{ from{transform:translateX(-40px)} to{transform:translateX(50px)} }
@keyframes ts-drift-b{ from{transform:translateX(30px)} to{transform:translateX(-45px)} }
@keyframes ts-drift-c{ from{transform:translateX(-25px)} to{transform:translateX(40px)} }

.ts-rise .ts-m1{ animation: ts-m1-rise var(--d) linear both }
.ts-rise .ts-m2{ animation: ts-m2-rise var(--d) linear both }
.ts-rise .ts-m3{ animation: ts-m3-rise var(--d) linear both }
.ts-set  .ts-m1{ animation: ts-m1-set  var(--d) linear both }
.ts-set  .ts-m2{ animation: ts-m2-set  var(--d) linear both }
.ts-set  .ts-m3{ animation: ts-m3-set  var(--d) linear both }
@keyframes ts-m1-rise{ 0%,12%{fill:#1a2147} 42%{fill:#6a4f86} 100%{fill:#8eb4e0} }
@keyframes ts-m2-rise{ 0%,12%{fill:#111833} 42%{fill:#42336a} 100%{fill:#5a86bc} }
@keyframes ts-m3-rise{ 0%,12%{fill:#0a0f22} 42%{fill:#2a2047} 100%{fill:#35608f} }
@keyframes ts-m1-set { 0%,15%{fill:#8eb4e0} 48%{fill:#6a4f86} 100%{fill:#1a2147} }
@keyframes ts-m2-set { 0%,15%{fill:#5a86bc} 48%{fill:#42336a} 100%{fill:#111833} }
@keyframes ts-m3-set { 0%,15%{fill:#35608f} 48%{fill:#2a2047} 100%{fill:#0a0f22} }

/* Caption block */
.ts-caption{
  position:absolute; left:0; right:0; bottom:clamp(6%, 8vh, 12%);
  text-align:center; color:#fff;
  text-shadow:0 2px 16px rgba(0,0,0,.5);
  animation: ts-label var(--d) ease-in-out both;
  padding:0 16px;
  pointer-events:none;
}
.ts-title{
  margin:0;
  letter-spacing:0.28em;
  font-size:clamp(12px, 2.6vw, 16px);
  font-weight:600;
  text-transform:uppercase;
}
.ts-line{
  margin:8px 0 0;
  letter-spacing:0.04em;
  font-size:clamp(12px, 2vw, 14px);
  font-weight:400;
  opacity:0.88;
  text-transform:none;
}
@keyframes ts-label{
  0%,14%{ opacity:0; transform:translateY(10px) }
  32%,62%{ opacity:1; transform:translateY(0) }
  88%,100%{ opacity:0; transform:translateY(-6px) }
}

.ts-spark{ opacity:0 }
.ts-rise .ts-spark{ animation: ts-spark-in var(--d) ease-out both }
.ts-set  .ts-spark{ animation: ts-spark-out var(--d) ease-in both }
@keyframes ts-spark-in{
  0%,35%{ opacity:0; transform:scale(0) }
  55%{ opacity:1; transform:scale(1.2) }
  100%{ opacity:.7; transform:scale(1) }
}
@keyframes ts-spark-out{
  0%{ opacity:.7; transform:scale(1) }
  40%{ opacity:1; transform:scale(1.15) }
  100%{ opacity:0; transform:scale(.4) }
}

@media (prefers-reduced-motion: reduce){
  .ts-root{ animation-duration: 400ms !important }
  .ts-sun, .ts-moon, .ts-cloud-a, .ts-cloud-b, .ts-cloud-c, .ts-star{
    animation: none !important;
  }
}

@media (max-width: 640px){
  .ts-title{ letter-spacing: 0.16em }
  .ts-caption{ bottom: 10% }
}
`;

const ThemeScene = ({ type }) => {
    const rising = type === "sunrise";
    const copy = useMemo(() => getTimeCopy(type), [type]);

    return createPortal(
        <div
            className={`ts-root ${rising ? "ts-rise" : "ts-set"}`}
            aria-hidden="true"
            role="presentation"
        >
            <style>{css}</style>

            <svg
                className="ts-svg"
                viewBox="0 0 1600 900"
                preserveAspectRatio="xMidYMid slice"
            >
                {/* ... keep your existing SVG markup unchanged ... */}
                <defs>
                    <linearGradient id="ts-night" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#060914" />
                        <stop offset="0.55" stopColor="#1a2758" />
                        <stop offset="1" stopColor="#3a2a68" />
                    </linearGradient>
                    <linearGradient id="ts-dawn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2a2868" />
                        <stop offset="0.4" stopColor="#c04878" />
                        <stop offset="0.72" stopColor="#ff9550" />
                        <stop offset="1" stopColor="#ffd078" />
                    </linearGradient>
                    <linearGradient id="ts-day" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2a88f0" />
                        <stop offset="0.55" stopColor="#7ec2ff" />
                        <stop offset="1" stopColor="#e8f6ff" />
                    </linearGradient>
                    <radialGradient id="ts-halo">
                        <stop offset="0" stopColor="#fff8d0" stopOpacity="0.95" />
                        <stop offset="0.4" stopColor="#ffc46b" stopOpacity="0.5" />
                        <stop offset="1" stopColor="#ff9a56" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="ts-horizon">
                        <stop offset="0" stopColor="#ffb56b" stopOpacity="0.95" />
                        <stop offset="0.55" stopColor="#ff7a5c" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#ff7a5c" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="ts-mist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#fff" stopOpacity="0" />
                        <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
                    </linearGradient>
                    <mask id="ts-moon-mask" maskUnits="userSpaceOnUse">
                        <rect x="-100" y="-100" width="200" height="200" fill="#fff" />
                        <circle cx="16" cy="-10" r="32" fill="#000" />
                    </mask>
                </defs>

                <rect width="1600" height="900" fill="url(#ts-night)" />
                <rect className="ts-dawn" width="1600" height="900" fill="url(#ts-dawn)" />
                <rect className="ts-day" width="1600" height="900" fill="url(#ts-day)" />

                <g className="ts-stars">
                    {STARS.map((s, i) => (
                        <circle
                            key={i}
                            className="ts-star"
                            cx={s.x}
                            cy={s.y}
                            r={s.r}
                            fill="#fff"
                            style={{ animationDelay: `${s.delay}s` }}
                        />
                    ))}
                </g>

                <g transform="translate(1240 170)">
                    <g className="ts-moon">
                        <circle r="64" fill="#cfd8ff" opacity="0.14" />
                        <circle r="34" fill="#f5f2e6" mask="url(#ts-moon-mask)" />
                    </g>
                </g>

                <ellipse
                    className="ts-glow"
                    cx="800"
                    cy="620"
                    rx="900"
                    ry="280"
                    fill="url(#ts-horizon)"
                />

                <g transform="translate(800 360)">
                    <g className="ts-sun">
                        <circle className="ts-sun-halo" r="210" fill="url(#ts-halo)" />
                        <circle className="ts-sun-core" r="56" fill="#fff0a0" />
                        <g className="ts-spark" fill="#fff">
                            <circle cx="90" cy="-40" r="3" />
                            <circle cx="-95" cy="20" r="2.5" />
                            <circle cx="70" cy="70" r="2" />
                            <circle cx="-80" cy="-55" r="2.2" />
                        </g>
                    </g>
                </g>

                <g className="ts-clouds">
                    <g className="ts-cloud ts-cloud-a">
                        <ellipse cx="280" cy="200" rx="100" ry="26" />
                        <ellipse cx="340" cy="182" rx="64" ry="28" />
                        <ellipse cx="230" cy="188" rx="54" ry="22" />
                    </g>
                    <g className="ts-cloud ts-cloud-b">
                        <ellipse cx="1080" cy="145" rx="120" ry="28" />
                        <ellipse cx="1150" cy="124" rx="72" ry="30" />
                        <ellipse cx="1015" cy="132" rx="58" ry="22" />
                    </g>
                    <g className="ts-cloud ts-cloud-c">
                        <ellipse cx="1440" cy="280" rx="90" ry="22" />
                        <ellipse cx="1490" cy="264" rx="54" ry="24" />
                    </g>
                </g>

                <path
                    className="ts-m1"
                    d="M0 620 L180 430 L300 520 L470 360 L640 540 L780 450 L960 580 L1120 400 L1300 540 L1440 450 L1600 560 L1600 900 L0 900 Z"
                />
                <path
                    className="ts-m2"
                    d="M0 700 L150 560 L320 660 L520 520 L720 680 L900 560 L1100 690 L1280 570 L1450 670 L1600 600 L1600 900 L0 900 Z"
                />
                <rect x="0" y="520" width="1600" height="260" fill="url(#ts-mist)" />
                <path
                    className="ts-m3"
                    d="M0 800 L200 690 L380 790 L600 700 L820 800 L1040 710 L1260 810 L1450 730 L1600 790 L1600 900 L0 900 Z"
                />
            </svg>

            <div className="ts-caption">
                <p className="ts-title">{copy.title}</p>
                <p className="ts-line">{copy.line}</p>
            </div>
        </div>,
        document.body,
    );
};

export default ThemeScene;