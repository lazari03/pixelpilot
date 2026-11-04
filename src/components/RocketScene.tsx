"use client";
import { useEffect, useRef, useState } from "react";
import type { Challenge, Frame } from "@/domain/program";
import { useLocale } from "@/i18n/LocaleProvider";
export default function RocketScene({
  challenge,
  frame,
  running,
  paused,
  arrived,
  blocked,
  theme = "nebula",
}: {
  challenge: Challenge;
  frame: Frame;
  running: boolean;
  paused: boolean;
  arrived: boolean;
  blocked: boolean;
  theme?: string;
}) {
  const { t } = useLocale();
  const previous = useRef(frame);
  const [heading, setHeading] = useState(90),
    [effect, setEffect] = useState(""),
    [info, setInfo] = useState("");
  useEffect(() => {
    const old = previous.current;
    const dx = frame.x - old.x,
      dy = frame.y - old.y;
    if (dx || dy) {
      setHeading(dx > 0 ? 90 : dx < 0 ? -90 : dy > 0 ? 180 : 0);
      setEffect("thrust");
    } else if (frame.energy > old.energy) setEffect("charging");
    previous.current = frame;
    const timer = setTimeout(() => setEffect(""), 350);
    return () => clearTimeout(timer);
  }, [frame]);
  return (
    <div
      className={`space-scene theme-${theme} ${arrived ? "arrived" : ""} ${blocked ? "impact" : ""} ${paused ? "flight-paused" : ""}`}
    >
      <svg viewBox="0 0 600 600" role="img" aria-label={t("spaceMap")}>
        <defs>
          <radialGradient id="planet">
            <stop stopColor="#b9f4ff" />
            <stop offset=".5" stopColor="#5879ac" />
            <stop offset="1" stopColor="#233359" />
          </radialGradient>
          <linearGradient id="hull" x2="1" y2="1">
            <stop stopColor="#fff" />
            <stop offset=".55" stopColor="#c9e2ec" />
            <stop offset="1" stopColor="#6b90af" />
          </linearGradient>
          <linearGradient id="glass" x2="1" y2="1">
            <stop stopColor="#a4f7ff" />
            <stop offset="1" stopColor="#176298" />
          </linearGradient>
          <linearGradient id="fire" x2="0" y2="1">
            <stop stopColor="#fff7c4" />
            <stop offset=".45" stopColor="#ffad4d" />
            <stop offset="1" stopColor="#ff557d" stopOpacity="0" />
          </linearGradient>
          <pattern
            id="space-grid"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M100 0H0V100"
              fill="none"
              stroke="#d5efff"
              strokeOpacity=".09"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <g className="distant-stars">
          {Array.from({ length: 70 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 137 + 31) % 600}
              cy={(i * 193 + 19) % 600}
              r={i % 5 === 0 ? 1.8 : 0.8}
              fill="#d8f2ff"
              opacity={0.25 + (i % 5) / 8}
            />
          ))}
        </g>
        <circle cx="510" cy="90" r="92" fill="url(#planet)" opacity=".25" />
        <ellipse
          cx="510"
          cy="90"
          rx="140"
          ry="26"
          fill="none"
          stroke="#9bbae7"
          strokeOpacity=".15"
          transform="rotate(-25 510 90)"
        />
        <rect width="600" height="600" fill="url(#space-grid)" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i} fill="#9bb3cc" opacity=".5" fontSize="11">
            <text x={i * 100 + 7} y="15">
              {String.fromCharCode(65 + i)}
            </text>
            <text x="7" y={i * 100 + 94}>
              {i + 1}
            </text>
          </g>
        ))}
        <g transform="translate(50 50)">
          <circle
            r="37"
            fill="none"
            stroke="#6db3c9"
            strokeDasharray="4 7"
            strokeOpacity=".45"
          />
          <text y="4" textAnchor="middle" fontSize="9" fill="#8fb4ca">
            {t("launchPad")}
          </text>
        </g>
        {challenge.walls.map(([x, y], i) => (
          <g
            key={`${x}-${y}`}
            transform={`translate(${x * 100 + 50} ${y * 100 + 50})`}
          >
            <g className="asteroid" style={{ animationDelay: `-${i * 3}s` }}>
              <path
                d="M-35 -8L-22 -30L6 -36L31 -20L38 6L20 31L-8 37L-31 23Z"
                fill="#546478"
                stroke="#8190a2"
                strokeWidth="2"
              />
              <path
                d="M-22 -30L-9 -9L6 -36M-9 -9L-31 23M-9 -9L20 31M-9 -9L31 -20"
                stroke="#38485e"
                strokeWidth="3"
                opacity=".8"
              />
              <circle cx="12" cy="-11" r="10" fill="#3c4b60" />
              <circle cx="-13" cy="13" r="7" fill="#3c4b60" />
              <path
                d="M-26 -11L-17 -23"
                stroke="#acb5be"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </g>
        ))}
        <g
          transform={`translate(${challenge.goal[0] * 100 + 50} ${challenge.goal[1] * 100 + 50})`}
          className="space-dock"
        >
          <circle r="43" fill="#192d45" stroke="#6fe8cd" strokeWidth="2" />
          <circle
            className="dock-ring"
            r="35"
            fill="none"
            stroke="#6fe8cd"
            strokeWidth="3"
            strokeDasharray="10 13"
          />
          <path
            d="M-40 -20V-35H-22M22 -35H40V-20M40 20V35H22M-22 35H-40V20"
            fill="none"
            stroke="#c5f9ee"
            strokeWidth="4"
          />
          <path
            className="dock-left"
            d="M-28 -18H-5V18H-28Z"
            fill="#456b80"
            stroke="#a5d4dd"
          />
          <path
            className="dock-right"
            d="M5 -18H28V18H5Z"
            fill="#456b80"
            stroke="#a5d4dd"
          />
          <circle r="8" fill="#6ce8c6" filter="url(#glow)" opacity=".7" />
        </g>
        <g
          className="ship-position"
          style={{
            transform: `translate(${frame.x * 100 + 50}px,${frame.y * 100 + 50}px)`,
          }}
        >
          <g className="ship-launch">
            <g
              className="ship-heading"
              style={{ transform: `rotate(${heading}deg)` }}
            >
              {running && !paused && effect === "thrust" && (
                <g className="engine-plume">
                  <path
                    d="M-10 22Q-21 53 0 74Q21 53 10 22Z"
                    fill="url(#fire)"
                  />
                  <path d="M-5 23Q-9 45 0 53Q9 45 5 23Z" fill="#fff9db" />
                  {[0, 1, 2].map((i) => (
                    <circle
                      key={i}
                      className="exhaust-spark"
                      cy={45 + i * 9}
                      cx={i % 2 ? 8 : -6}
                      r="2"
                      fill="#ffdc98"
                    />
                  ))}
                </g>
              )}
              <ellipse cy="19" rx="12" ry="7" fill="#233954" />
              <path
                d="M-11 -2Q-29 8-27 30L-8 19Z"
                fill="#ec7d65"
                stroke="#a94f53"
              />
              <path
                d="M11 -2Q29 8 27 30L8 19Z"
                fill="#ec7d65"
                stroke="#a94f53"
              />
              <path
                d="M0 -38C-21 -20-21 12-10 23H10C21 12 21 -20 0 -38Z"
                fill="url(#hull)"
                stroke="#c8e6ee"
                strokeWidth="1.5"
              />
              <path
                d="M0 -38C-9 -30-13 -21-14 -13H14C13 -21 9 -30 0 -38Z"
                fill="#f58a70"
              />
              <circle
                cy="-5"
                r="11"
                fill="#234459"
                stroke="#829fb1"
                strokeWidth="3"
              />
              <circle cy="-5" r="7.5" fill="url(#glass)" />
              <path
                d="M-4 -9L1 -12"
                stroke="#efffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0 9V25"
                stroke="#f29470"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="-8" cy="14" r="2" fill="#7ef5ce" />
              {effect === "charging" && (
                <circle
                  className="charge-ring"
                  r="34"
                  fill="none"
                  stroke="#80f9db"
                  strokeWidth="4"
                />
              )}
              <circle
                className="ship-shield"
                r="38"
                fill="#ff7979"
                fillOpacity=".12"
                stroke="#ff9a9a"
                strokeWidth="2"
              />
            </g>
          </g>
        </g>
        {arrived && (
          <g
            className="arrival-rays"
            transform={`translate(${challenge.goal[0] * 100 + 50} ${challenge.goal[1] * 100 + 50})`}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d="M0 -46V-70"
                transform={`rotate(${i * 30})`}
                stroke="#91f4d7"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
          </g>
        )}
      </svg>
      <div className="scene-interactions">
        {challenge.walls.map(([x, y]) => (
          <button
            key={`${x}-${y}`}
            style={{ left: `${(x / 6) * 100}%`, top: `${(y / 6) * 100}%` }}
            aria-label={t("asteroid")}
            onClick={() => setInfo(t("asteroidInfo"))}
          />
        ))}
        <button
          style={{
            left: `${(challenge.goal[0] / 6) * 100}%`,
            top: `${(challenge.goal[1] / 6) * 100}%`,
          }}
          aria-label={t("station")}
          onClick={() =>
            setInfo(t(challenge.gate ? "stationGateInfo" : "stationInfo"))
          }
        />
      </div>
      {info && (
        <button className="scene-info" onClick={() => setInfo("")}>
          {info} ×
        </button>
      )}
      <div className="scene-caption">
        {t(
          arrived
            ? "docked"
            : paused
              ? "paused"
              : running
                ? "inFlight"
                : "readyLaunch",
        )}
      </div>
    </div>
  );
}
