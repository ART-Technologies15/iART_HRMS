import QRCode from "qrcode";

/**
 * Builds the text encoded into an asset's QR code. Centralized here so the
 * modal and both PDF download paths always encode the same shape — change
 * the field list once and every QR (on-screen or in a PDF) updates together.
 *
 * Deliberately plain, labeled text rather than JSON: a phone's camera/QR
 * scanner just displays whatever string is encoded, with no JSON parsing
 * or formatting — so a JSON payload shows up to the person scanning it as
 * a raw `{"code":"...","name":"..."}` blob. Plain "Label - value" lines are
 * what actually reads as readable info on a phone screen.
 *
 * Deliberately uses " - " rather than ": " between label and value. A
 * "word:" at the start of a line reads to some phones' "smart" QR scanners
 * (Android's built-in URI-scheme detection is the common offender) as a
 * custom URI scheme, like "tel:" or "mailto:" — the scanner then tries to
 * hand the whole payload off to an app registered for that scheme and, if
 * none exists, throws "there aren't any apps that can open this" instead
 * of just showing the text. Avoiding colons sidesteps that misdetection
 * entirely so the payload always renders as plain readable text.
 *
 * Kept intentionally compact (short labels, only IDs rather than full
 * nested objects) since QR density/scan reliability degrades as payload
 * size grows.
 */
// export const buildAssetQrPayload = (asset) => {
//     const assignedTo = asset.currentAssignedTo?.name;
//     const assignedToId = asset.currentAssignedTo?.employeeId || asset.currentAssignedTo?._id;

//     const lines = [
//         ["iART Technologies Pvt. Ltd."],
//         ["Code", asset.assetCode],
//         ["Asset", asset.assetName],
//         ["Category", asset.category],
//         ["Brand", asset.brand],
//         ["Model", asset.model],
//         ["Serial", asset.serialNumber],
//         ["Status", asset.status],
//         ["Condition", asset.condition],
//         ["Assigned To", assignedTo ? `${assignedTo}${assignedToId ? ` (${assignedToId})` : ""}` : null],
//     ];

//     // Drop rows with no value (keeps the header line as-is) rather than
//     // printing "Brand - " for fields the asset doesn't have.
//     return lines
//         .filter(([, value]) => value !== undefined && value !== null && value !== "")
//         .map(([label, value]) => (value === undefined ? label : `${label} - ${value}`))
//         .join("\n");
// };

export const buildAssetQrPayload = (asset) => {
    // return `http://localhost:5173/asset/${asset._id}`;
    return `https://hrms.iarttechnologies.com/asset/${asset._id}`;
};

/**
 * Generates a QR code as a PNG data URL for arbitrary text.
 */
export const generateQrDataUrl = async (text, size = 300) => {
    return QRCode.toDataURL(String(text), {
        width: size,
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
            dark: "#1e293b", // slate-800
            light: "#ffffff",
        },
    });
};