export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pos-bg text-pos-text">
      {children}
    </div>
  );
}