"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

import { cn } from "@/lib/utils";

type ScriptStatus = "idle" | "loading" | "ready" | "error";

type MarkerSize = {
  width: number;
  height: number;
};

type NaverMapLatLng = {
  lat: () => number;
  lng: () => number;
};

type NaverMapInstance = {
  setCenter: (latLng: NaverMapLatLng) => void;
  setZoom: (zoom: number) => void;
  destroy?: () => void;
};

type NaverMarkerInstance = {
  setMap: (map: NaverMapInstance | null) => void;
  setPosition: (latLng: NaverMapLatLng) => void;
  setTitle?: (title: string) => void;
};

type NaverMapsAPI = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMapInstance;
  LatLng: new (lat: number, lng: number) => NaverMapLatLng;
  Marker: new (options: Record<string, unknown>) => NaverMarkerInstance;
  Size: new (width: number, height: number) => { width: number; height: number };
  Point: new (x: number, y: number) => { x: number; y: number };
  Event: {
    addListener: (map: NaverMapInstance, eventName: string, handler: () => void) => void;
  };
};

type NaverGlobal = {
  maps?: NaverMapsAPI;
};

type NaverSingleMarkerMapProps = {
  latitude: number;
  longitude: number;
  addressLine?: string;
  markerTitle?: string;
  markerImageUrl?: string;
  markerImageSize?: MarkerSize;
  zoom?: number;
  className?: string;
  height?: number;
};

declare global {
  interface Window {
    naver?: NaverGlobal;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const DEFAULT_ZOOM = 14;
const DEFAULT_HEIGHT = 240;

export function NaverSingleMarkerMap({
  latitude,
  longitude,
  addressLine,
  markerTitle,
  markerImageUrl,
  markerImageSize = { width: 48, height: 48 },
  zoom = DEFAULT_ZOOM,
  className,
  height = DEFAULT_HEIGHT,
}: NaverSingleMarkerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstancesRef = useRef<{ map?: NaverMapInstance; marker?: NaverMarkerInstance }>({});
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>(() =>
    CLIENT_ID ? "loading" : "error",
  );
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (scriptStatus !== "ready") {
      return undefined;
    }

    const { naver } = window;
    if (!naver?.maps || !mapContainerRef.current) {
      return undefined;
    }

    const position = new naver.maps.LatLng(latitude, longitude);

    if (!mapInstancesRef.current.map) {
      const map = new naver.maps.Map(mapContainerRef.current, {
        center: position,
        zoom,
        minZoom: 8,
        maxZoom: 18,
        draggable: true,
        pinchZoom: true,
        scrollWheel: false,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
        zoomControl: false,
      });

      const markerOptions: Record<string, unknown> = {
        position,
        map,
        title: markerTitle,
      };

      if (markerImageUrl) {
        markerOptions.icon = {
          url: markerImageUrl,
          size: new naver.maps.Size(markerImageSize.width, markerImageSize.height),
          scaledSize: new naver.maps.Size(
            markerImageSize.width,
            markerImageSize.height,
          ),
          origin: new naver.maps.Point(0, 0),
          anchor: new naver.maps.Point(
            markerImageSize.width / 2,
            markerImageSize.height,
          ),
        };
      }

      const marker = new naver.maps.Marker(markerOptions);

      naver.maps.Event.addListener(map, "mapError", () => {
        setScriptStatus("error");
      });

      mapInstancesRef.current = { map, marker };
      setMapReady(true);

      return () => {
        if (mapInstancesRef.current.marker) {
          mapInstancesRef.current.marker.setMap(null);
        }
        if (mapInstancesRef.current.map) {
          mapInstancesRef.current.map.destroy?.();
        }
        mapInstancesRef.current = {};
      };
    }

    const { map, marker } = mapInstancesRef.current;
    map.setCenter(position);
    map.setZoom(zoom);
    marker?.setPosition(position);
    if (markerTitle && marker?.setTitle) {
      marker.setTitle(markerTitle);
    }
    setMapReady(true);

    return undefined;
  }, [
    latitude,
    longitude,
    markerTitle,
    markerImageSize.height,
    markerImageSize.width,
    markerImageUrl,
    scriptStatus,
    zoom,
  ]);

  const scriptSrc = CLIENT_ID
    ? `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}`
    : undefined;

  const showError = scriptStatus === "error";
  const showSkeleton = !mapReady && !showError;

  return (
    <div>
      {scriptSrc ? (
        <Script
          src={scriptSrc}
          strategy="afterInteractive"
          onReady={() => setScriptStatus("ready")}
          onError={() => setScriptStatus("error")}
        />
      ) : null}
      <div
        ref={mapContainerRef}
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted",
          className,
        )}
        style={{ minHeight: height }}
        aria-label={markerTitle ?? "크루 활동 위치 지도"}
      >
        {showSkeleton ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
            지도 불러오는 중...
          </div>
        ) : null}
        {showError ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
            지도를 불러오지 못했습니다. 위치 정보를 다시 확인해주세요.
          </div>
        ) : null}
      </div>
      {addressLine ? (
        <p className="mt-3 text-sm text-muted-foreground">{addressLine}</p>
      ) : null}
      {!CLIENT_ID ? (
        <p className="mt-2 text-xs text-amber-600">
          NAVER 지도 API 키(`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`)가 설정되지 않아 지도가 표시되지 않습니다.
        </p>
      ) : null}
    </div>
  );
}
