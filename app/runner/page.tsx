import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Vocab Runner — Drive your vocabulary",
  description: "3D Endless runner vocabulary driving game",
};

const RunnerGame = dynamic(
  () => import("@/components/runner/ui/RunnerGame"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#132b37",
          color: "#8df0c8",
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        LOADING 3D HIGHWAY…
      </div>
    ),
  }
);

export default function RunnerPage() {
  return <RunnerGame />;
}
