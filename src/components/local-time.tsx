"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function LocalTime({ value }: { value: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <time dateTime={value}>
      {mounted
        ? new Date(value).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : value}
    </time>
  );
}
