import { DesignSystemLab } from "./design-system-lab";

export const metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return (
    <main id="content" className="min-h-dvh bg-canvas">
      <DesignSystemLab />
    </main>
  );
}
