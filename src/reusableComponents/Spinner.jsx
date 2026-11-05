import { Loader2 } from "lucide-react";

const Spinner = ({ size = 24, className = "" }) => {
  return (
    <Loader2
      className={`animate-spin text-primary-500 ${className}`}
      style={{ height: size, width: size }}
    />
  );
};

export const FullPageSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <Spinner size={40} />
  </div>
);

export default Spinner;
