import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    Hash,
    Layers,
    BadgeInfo,
    Cpu,
    Barcode,
    Activity,
    ShieldCheck,
    User,
    LoaderCircle,
} from "lucide-react";

import { getAssetById } from "../api/assetsApi";
import logo from "../assets/logoiart.svg";

// Status → stamp color. Falls back to the "in stock" look for any status
// string that isn't one of these (new statuses added later just render
// neutral instead of breaking).
const STATUS_STYLE = {
    Assigned: { ring: "border-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    "In Stock": { ring: "border-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    Retired: { ring: "border-slate-400", text: "text-slate-500", bg: "bg-slate-50" },
    Damaged: { ring: "border-red-500", text: "text-red-700", bg: "bg-red-50" },
};
const getStatusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE["In Stock"];

const SpecRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-2.5 text-slate-400">
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{label}</span>
        </div>
        <span className="font-mono text-sm font-medium text-slate-800">{value || "—"}</span>
    </div>
);

export default function PublicAssetPage() {
    const { assetId } = useParams();

    const [loading, setLoading] = useState(true);
    const [asset, setAsset] = useState(null);

    useEffect(() => {
        loadAsset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetId]);

    const loadAsset = async () => {
        try {
            setLoading(true);
            const res = await getAssetById(assetId);
            // API responds { success, asset: {...} }. Depending on the
            // http client, `res` is either that body directly or an
            // { data: body } wrapper — unwrap both layers so `asset` is
            // always the actual asset object, not the envelope.
            const body = res?.data ?? res;
            setAsset(body?.asset ?? body ?? null);
        } catch (err) {
            console.error(err);
            setAsset(null);
        } finally {
            setLoading(false);
        }
    };

    const pageBg = {
        backgroundColor: "#EEF0F2",
        backgroundImage: "radial-gradient(circle, #D7DCE3 1px, transparent 1px)",
        backgroundSize: "18px 18px",
    };
    const displayFont = { fontFamily: "'Space Grotesk', ui-sans-serif, sans-serif" };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={pageBg}>
                <LoaderCircle className="h-8 w-8 animate-spin text-slate-400" strokeWidth={1.75} />
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}>
                <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        iART Technologies
                    </p>
                    <h2 className="mt-3 text-lg font-bold text-slate-900" style={displayFont}>
                        Asset Not Found
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                        This tag doesn&apos;t match any asset on record.
                    </p>
                </div>
            </div>
        );
    }

    const assignedTo = asset.currentAssignedTo;
    const statusStyle = getStatusStyle(asset.status);

    return (
        <div className="min-h-screen px-4 py-10" style={pageBg}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`}</style>

            <div className="mx-auto w-full max-w-xl">
                <div className="relative overflow-visible rounded-[22px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_36px_-24px_rgba(15,23,42,0.35)]">
                    {/* Tag notch — reads as a hang-tag hole punched through the card */}
                    <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-[#EEF0F2]" />

                    {/* Header */}
                    <div className="px-7 pb-5 pt-9 text-center">
                        <img src={logo} alt="" className="mx-auto h-8 w-auto object-contain" />
                        <p className="mt-2 text-[13px] font-bold text-slate-900" style={displayFont}>
                            iART Technologies Pvt. Ltd.
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Asset Passport
                        </p>
                    </div>

                    {/* Identity block */}
                    <div className="relative border-t-2 border-dashed border-slate-200 px-7 pb-6 pt-7">
                        <div
                            className={`absolute -right-3 -top-4 flex h-[72px] w-[72px] rotate-[-9deg] flex-col items-center justify-center rounded-full border-2 ${statusStyle.ring} ${statusStyle.bg}`}
                        >
                            <span className={`text-[7px] font-bold uppercase tracking-[0.14em] ${statusStyle.text}`}>
                                Status
                            </span>
                            <span className={`px-1 text-center text-[10px] font-black uppercase leading-tight ${statusStyle.text}`}>
                                {asset.status || "—"}
                            </span>
                        </div>

                        <h1 className="max-w-[75%] text-2xl font-bold leading-tight text-slate-900" style={displayFont}>
                            {asset.assetName || "Unnamed Asset"}
                        </h1>
                        <p
                            className="mt-1.5 inline-block rounded-md bg-slate-50 px-2 py-1 text-sm font-semibold tracking-wide text-slate-600"
                            style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                        >
                            {asset.assetCode || "—"}
                        </p>
                    </div>

                    {/* Specifications */}
                    <div className="border-t border-slate-100 px-7 py-2">
                        <p className="pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Specifications
                        </p>
                        <div className="divide-y divide-slate-100">
                            <SpecRow icon={Layers} label="Category" value={asset.category} />
                            <SpecRow icon={BadgeInfo} label="Brand" value={asset.brand} />
                            <SpecRow icon={Cpu} label="Model" value={asset.model} />
                            <SpecRow icon={Barcode} label="Serial No." value={asset.serialNumber} />
                            <SpecRow icon={Activity} label="Status" value={asset.status} />
                            <SpecRow icon={ShieldCheck} label="Condition" value={asset.condition} />
                        </div>
                    </div>

                    {/* Assigned to */}
                    <div className="border-t border-slate-100 px-7 py-5">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Assigned To
                        </p>
                        {assignedTo ? (
                            <div className="flex items-center gap-3">
                                {assignedTo.profilePhoto ? (
                                    <img
                                        src={assignedTo.profilePhoto}
                                        alt=""
                                        className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                                        {assignedTo.name?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{assignedTo.name}</p>
                                    {assignedTo.employeeId && (
                                        <p
                                            className="text-xs text-slate-500"
                                            style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
                                        >
                                            {assignedTo.employeeId}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Not assigned</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 bg-slate-50/70 px-7 py-4 text-center">
                        <p className="text-[11px] text-slate-400">
                            © {new Date().getFullYear()} iART Technologies Pvt. Ltd.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}