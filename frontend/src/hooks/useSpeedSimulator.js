import { useState, useEffect, useRef, useCallback } from "react";

const ZONE_LIMITS = {
  school:      20,
  hospital:    25,
  residential: 30,
  highway:     70,
  urban:       40,
};

export function useSpeedSimulator(zoneType = "urban") {
  const [speed, setSpeed]         = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const targetRef  = useRef(0);
  const frameRef   = useRef(null);

  const speedLimit = ZONE_LIMITS[zoneType] ?? 40;

  // Smooth acceleration toward target
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      setSpeed((prev) => {
        const diff = targetRef.current - prev;
        const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.08, 1.5);
        const next = Math.max(0, prev + step + (Math.random() - 0.5) * 0.3);
        return parseFloat(next.toFixed(1));
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning]);

  const setTargetSpeed = useCallback((v) => {
    targetRef.current = Math.max(0, v);
  }, []);

  const toggleSimulation = useCallback(() => {
    setIsRunning((r) => {
      if (!r) targetRef.current = speedLimit * 0.8;
      else     targetRef.current = 0;
      return !r;
    });
  }, [speedLimit]);

  const accelerate = useCallback(() => {
    targetRef.current = Math.min(targetRef.current + 15, 130);
  }, []);

  const brake = useCallback(() => {
    targetRef.current = Math.max(0, targetRef.current - 15);
  }, []);

  return {
    speed,
    speedLimit,
    isRunning,
    toggleSimulation,
    accelerate,
    brake,
    setTargetSpeed,
    isViolation: speed > speedLimit + 5,
  };
}
