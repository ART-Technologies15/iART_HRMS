import jsPDF from "jspdf";
import { generateQrDataUrl, buildAssetQrPayload } from "./Qrcode";
import logoUrl from "../assets/logoiart.svg";

const COMPANY_NAME = "iART Technologies Pvt. Ltd.";

// Reference dimensions the "large" single-card design was tuned against
// (the A6 single-export card: 105x148mm page minus 8mm margins on each
// side). Every card — single or bulk-grid — is drawn with this same design
// and just scaled down from these numbers, so the two exports always look
// like the same card at different sizes rather than two different layouts.
const BASE_CARD_WIDTH = 89;
const BASE_CARD_HEIGHT = 132;

let logoDataUrlPromise = null;
const getLogoDataUrl = () => {
    if (!logoDataUrlPromise) {
        logoDataUrlPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const scale = 3;
                const canvas = document.createElement("canvas");
                canvas.width = (img.width || 64) * scale;
                canvas.height = (img.height || 64) * scale;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(null);
            img.src = logoUrl;
        });
    }
    return logoDataUrlPromise;
};

/**
 * Draws one asset card. This is the single source of truth for the card
 * design — logo, company name, divider, asset name, QR, code, footer with
 * scan instructions + URL. `scale` (derived from how this card's actual
 * width/height compare to the single-card reference size above) shrinks
 * every fixed mm value — padding, font sizes, footer height, gaps — so a
 * small bulk-grid card is a faithful scaled-down copy of the single-export
 * card rather than a separately hand-tuned "compact" layout.
 */
const drawAssetCard = (doc, asset, qrDataUrl, logoDataUrl, x, y, width, height) => {
    const scale = Math.max(Math.min(width / BASE_CARD_WIDTH, height / BASE_CARD_HEIGHT), 0.4);

    // 1. Outer Rounded Card Frame
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(Math.max(0.35 * scale, 0.2));
    doc.roundedRect(x, y, width, height, Math.max(3 * scale, 1), Math.max(3 * scale, 1));

    const padding = Math.max(6 * scale, 2.5);
    const centerX = x + width / 2;
    const contentWidth = width - padding * 2;

    // Proportional footer height boundary to avoid text collision
    const footerHeight = Math.max(18 * scale, 8);
    const footerTopY = y + height - footerHeight;

    let cursorY = y + padding;

    // ==========================================
    // HEADER ZONE — centered logo, centered name below it
    // ==========================================
    const hasLogo = !!logoDataUrl;

    if (hasLogo) {
        const logoW = Math.min(contentWidth * 0.5, 44 * scale);
        const logoH = Math.max(8 * scale, logoW * 0.32);
        try {
            doc.addImage(logoDataUrl, "PNG", centerX - logoW / 2, cursorY, logoW, logoH);
        } catch (e) { /* ignore */ }
        cursorY += logoH + Math.max(6 * scale, 2);
    } else {
        cursorY += Math.max(8 * scale, 3);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(11 * scale, 5.5));
    doc.setTextColor(15, 23, 42);
    doc.text(COMPANY_NAME, centerX, cursorY, { align: "center", baseline: "top" });
    cursorY += Math.max(7 * scale, 3);

    // Header Horizontal Rule
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(Math.max(0.3 * scale, 0.2));
    doc.line(x + padding, cursorY, x + width - padding, cursorY);
    cursorY += Math.max(6 * scale, 2.5);

    // ==========================================
    // BODY ZONE — asset name, QR, code
    // ==========================================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(14 * scale, 6.5));
    doc.setTextColor(15, 23, 42);

    const lineStep = Math.max(6.5 * scale, 3.2);
    const nameLines = doc.splitTextToSize(asset.assetName || "Unnamed Asset", contentWidth).slice(0, 2);
    doc.text(nameLines, centerX, cursorY, { align: "center", baseline: "top" });

    cursorY += nameLines.length * lineStep + Math.max(4 * scale, 1.5);

    const qrTop = cursorY;
    // ---------- QR ----------
    const reservedCodeSpace = Math.max(8 * scale, 5);
    const maxAvailableQrHeight = footerTopY - qrTop - reservedCodeSpace;
    const qrFraction = 0.68;
    const qrSize = Math.max(Math.min(contentWidth * qrFraction, maxAvailableQrHeight), 12);
    const qrX = centerX - qrSize / 2;

    try {
        doc.addImage(qrDataUrl, "PNG", qrX, qrTop, qrSize, qrSize);
    } catch (e) { /* ignore */ }

    // ---------- Asset Code ----------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.max(9 * scale, 5.5));
    doc.setTextColor(71, 85, 105);

    const codeTargetY = qrTop + qrSize + Math.max(3 * scale, 1.5);
    doc.text(asset.assetCode || "-", centerX, codeTargetY, { align: "center", baseline: "top" });

    // ==========================================
    // FOOTER ZONE — scan instructions & URL
    // ==========================================
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(Math.max(0.3 * scale, 0.2));
    doc.line(x + padding, footerTopY, x + width - padding, footerTopY);

    const footerContentOffsetY = footerHeight * 0.22;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(Math.max(8 * scale, 4.5));
    doc.text("Scan QR to view asset information", centerX, footerTopY + footerContentOffsetY, {
        align: "center",
        baseline: "top",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(8 * scale, 4.5));
    doc.setTextColor(59, 130, 246);
    doc.text("https://iarttechnologies.com/", centerX, footerTopY + footerContentOffsetY + Math.max(4.5 * scale, 2.5), {
        align: "center",
        baseline: "top",
    });
};

const drawPageHeader = (doc, logoDataUrl, pageWidth, margin) => {
    const centerX = pageWidth / 2;
    const hasLogo = !!logoDataUrl;
    let cursorY = margin;

    // Centered Logo
    if (hasLogo) {
        const logoW = 28;
        const logoH = Math.max(8, logoW * 0.32);
        try {
            doc.addImage(logoDataUrl, "PNG", centerX - logoW / 2, cursorY, logoW, logoH);
        } catch (e) { /* ignore */ }
        cursorY += logoH + 4;
    } else {
        cursorY += 10;
    }

    // Company Name (centered)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(COMPANY_NAME, centerX, cursorY, { align: "center", baseline: "top" });
    cursorY += 8;

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Asset QR Labels Catalog", centerX, cursorY, { align: "center", baseline: "top" });
    cursorY += 6;

    // Generation Date (top right)
    doc.setFontSize(9);
    const dateLabel = new Date().toLocaleDateString();
    doc.text(`Generated: ${dateLabel}`, pageWidth - margin, margin + 2, { align: "right", baseline: "top" });

    // Header separator line
    const headerBottom = cursorY + 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

    return headerBottom + 6;
};

const drawPageFooter = (doc, currentPage, totalPages, pageWidth, pageHeight, margin) => {
    const footerY = pageHeight - margin + 4;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Confidential - Internal Asset Management", margin, footerY - 2, { baseline: "top" });
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY - 2, { align: "right", baseline: "top" });
};

export const downloadSingleAssetQrPdf = async (asset) => {
    const [qrDataUrl, logoDataUrl] = await Promise.all([
        generateQrDataUrl(buildAssetQrPayload(asset), 350),
        getLogoDataUrl(),
    ]);

    const doc = new jsPDF({ unit: "mm", format: "a6" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginX = 8;
    const marginY = 8;

    drawAssetCard(doc, asset, qrDataUrl, logoDataUrl, marginX, marginY, pageWidth - marginX * 2, pageHeight - marginY * 2);
    doc.save(`${asset.assetCode || "asset"}-qr.pdf`);
};

export const downloadAllAssetsQrPdf = async (assets, onProgress) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const footerMargin = 12;
    const cols = 3;
    const rows = 4;
    const cardsPerPage = cols * rows;

    const logoDataUrl = await getLogoDataUrl();
    const totalPages = Math.ceil(assets.length / cardsPerPage);

    let gridTop = drawPageHeader(doc, logoDataUrl, pageWidth, margin);
    const usableHeight = pageHeight - gridTop - footerMargin - 6;
    const cardWidth = (pageWidth - margin * 2) / cols;
    const cardHeight = usableHeight / rows;

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const indexOnPage = i % cardsPerPage;
        const currentPage = Math.floor(i / cardsPerPage) + 1;

        if (i > 0 && indexOnPage === 0) {
            drawPageFooter(doc, currentPage - 1, totalPages, pageWidth, pageHeight, footerMargin);
            doc.addPage();
            gridTop = drawPageHeader(doc, logoDataUrl, pageWidth, margin);
        }

        const col = indexOnPage % cols;
        const row = Math.floor(indexOnPage / cols);
        const x = margin + col * cardWidth;
        const y = gridTop + row * cardHeight;

        // eslint-disable-next-line no-await-in-loop -- QR generation must
        // finish before the image can be embedded, and doing these in
        // parallel for hundreds of assets risks spiking memory in-browser.
        const qrDataUrl = await generateQrDataUrl(buildAssetQrPayload(asset), 300);

        drawAssetCard(doc, asset, qrDataUrl, logoDataUrl, x + 2.5, y + 2.5, cardWidth - 5, cardHeight - 5);
        onProgress?.(i + 1, assets.length);

        if (i === assets.length - 1) {
            drawPageFooter(doc, currentPage, totalPages, pageWidth, pageHeight, footerMargin);
        }
    }
    doc.save(`all-assets-qr-${new Date().toISOString().slice(0, 10)}.pdf`);
};