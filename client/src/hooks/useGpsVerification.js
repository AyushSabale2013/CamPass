import { useState, useEffect, useRef, useCallback } from "react";

export function useGpsVerification({
  targetLat,
  targetLng,
  allowedRadius = 2000, // meters
  maxRetries = 2,
} = {}) {
  const [gpsStatus, setGpsStatus] = useState("pending");
  const [distance, setDistance] = useState(null);
  const [coords, setCoords] = useState(null);
  const retryCountRef = useRef(0);

  const haversineDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const handleSuccess = useCallback((position) => {
    retryCountRef.current = 0;
    const { latitude, longitude } = position.coords;
    setCoords({ lat: latitude, lng: longitude });
    setGpsStatus("granted");
    if (targetLat != null && targetLng != null) {
      setDistance(haversineDistance(latitude, longitude, targetLat, targetLng));
    }
  }, [targetLat, targetLng, haversineDistance]);

  const handleError = useCallback((error) => {
    if (error.code === error.PERMISSION_DENIED) {
      setGpsStatus("denied"); // real denial only — never confuse with timeout
      retryCountRef.current = 0;
      return;
    }
    // TIMEOUT or POSITION_UNAVAILABLE — retry before giving up
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      setGpsStatus("pending");
      requestLocation();
    } else {
      setGpsStatus(error.code === error.TIMEOUT ? "timeout" : "unavailable");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRetries]);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("unavailable");
      return;
    }
    setGpsStatus("pending");

    // Fast, low-accuracy fix first — resolves even on slow/weak connections
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccess(pos);
        // Silently refine in the background; ignore failures here
        navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
      },
      handleError,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
    );
  }, [handleSuccess, handleError]);

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    let permissionStatusRef;
    async function init() {
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          permissionStatusRef = status;
          if (status.state === "denied") {
            setGpsStatus("denied");
            return;
          }
          status.onchange = () => {
            if (status.state === "denied") setGpsStatus("denied");
            else if (status.state === "granted") requestLocation();
          };
        } catch {}
      }
      requestLocation();
    }
    init();
    return () => { if (permissionStatusRef) permissionStatusRef.onchange = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gpsVerified = gpsStatus === "granted" && distance !== null && distance <= allowedRadius;

  return { gpsStatus, gpsVerified, distance, coords, allowedRadius, retry };
}