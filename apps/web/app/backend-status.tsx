"use client";

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";

export function BackendStatus() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiClient
      .get<string>("/")
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to connect to backend",
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid var(--gray-alpha-200)",
        background: "var(--gray-alpha-100)",
        fontSize: "14px",
      }}
    >
      {loading && <span>Loading backend response...</span>}
      {error && (
        <span style={{ color: "#e5484d" }}>Backend error: {error}</span>
      )}
      {data && (
        <span>
          Backend response: <strong>{data}</strong>
        </span>
      )}
    </div>
  );
}
