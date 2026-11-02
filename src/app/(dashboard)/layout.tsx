import { Shell } from "@/components/layout/shell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <Shell>{children}</Shell>;
}
