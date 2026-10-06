export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className="panel w-full p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-24 rounded-full bg-[#eae7e3]" />
        <div className="h-8 w-2/3 rounded-full bg-[#f0eeeb]" />
        <div className="h-3 w-full rounded-full bg-[#f0eeeb]" />
        <div className="h-3 w-5/6 rounded-full bg-[#f0eeeb]" />
      </div>
      <p className="mt-4 text-sm font-medium text-[#5f5a56]">{label}</p>
    </div>
  );
}
