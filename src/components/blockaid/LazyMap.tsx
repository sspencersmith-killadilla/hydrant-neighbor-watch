import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type AssetMapType from "./AssetMap";

const AssetMap = lazy(() => import("./AssetMap"));

export function LazyMap(props: ComponentProps<typeof AssetMapType>) {
  const fallback = <div className={`${props.className ?? ""} animate-pulse bg-muted`} aria-label="Loading map" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <AssetMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
