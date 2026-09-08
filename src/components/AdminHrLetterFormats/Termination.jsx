import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";

import { getPhoneBook, assignLetter } from "../../api/authApi";
import iArtLogo from "../../assets/logoiart.svg";

export const Termination = () => {
    const letterRef = useRef(null);

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersLoaded, setUsersLoaded] = useState(false);

    const [pdfLoading, setPdfLoading] = useState(false);
    const [docLoading, setDocLoading] = useState(false);

    const [signature, setSignature] = useState(null);

    const [formData, setFormData] = useState({
        issueDate: "",
        title: "Mr.",
        candidateName: "",
        designation: "",
        department: "",
        terminationDate: "",
        reason: "",
        noticePeriod: "As per company policy",
        finalWorkingDate: "",
        authorizedPersonName: "Amar Nath",
        authorizedDesignation: "Director",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file (PNG, JPG, etc.) for the signature.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setSignature(reader.result);
        };

        reader.readAsDataURL(file);
    };

    const removeSignature = () => {
        setSignature(null);
    };

    const formatDate = (date) => {
        if (!date) return "DD/MM/YYYY";

        const d = new Date(`${date}T00:00:00`);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    };

    const getFileName = (extension) => {
        const candidate =
            formData.candidateName?.trim() || "Employee";

        const safeName = candidate
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "_");

        return `Termination_Letter_${safeName}.${extension}`;
    };

    const loadPhoneBookUsers = async () => {
        if (usersLoaded || usersLoading) return;

        try {
            setUsersLoading(true);

            const response = await getPhoneBook({
                page: 1,
                limit: 100,
                search: "",
            });

            if (response?.success) {
                setUsers(response.users || []);
                setUsersLoaded(true);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Phonebook loading error:", error);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleUserSelect = (e) => {
        const userId = e.target.value;

        if (!userId) {
            setSelectedUser(null);
            return;
        }

        const employee = users.find((user) => user._id === userId);

        if (!employee) return;

        setSelectedUser(employee);

        setFormData((prev) => ({
            ...prev,
            candidateName:
                employee.fullName ||
                employee.name ||
                prev.candidateName,

            designation:
                employee.designation ||
                prev.designation,

            department:
                employee.department ||
                prev.department,

            terminationDate:
                employee.terminationDate ||
                employee.dateOfTermination ||
                prev.terminationDate,

            finalWorkingDate:
                employee.lastWorkingDate ||
                employee.dateOfLeaving ||
                employee.dol ||
                prev.finalWorkingDate,
        }));
    };

    const waitForImages = async (root) => {
        const images = Array.from(root.querySelectorAll("img"));

        await Promise.all(
            images.map((img) => {
                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })
        );
    };

    const generatePdfBlob = async () => {
        if (!letterRef.current) {
            throw new Error("Termination letter preview not found.");
        }

        const source = letterRef.current;

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        await waitForImages(source);

        const PAGE_WIDTH_PX = 794;
        const PAGE_HEIGHT_PX = 1123;

        const canvas = await html2canvas(source, {
            scale: 2.2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: PAGE_WIDTH_PX,
            height: PAGE_HEIGHT_PX,
            windowWidth: PAGE_WIDTH_PX,
            windowHeight: PAGE_HEIGHT_PX,
            scrollX: 0,
            scrollY: 0,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.97);

        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(
            imgData,
            "JPEG",
            0,
            0,
            pdfWidth,
            pdfHeight,
            undefined,
            "FAST"
        );

        return pdf.output("blob");
    };

    const handleDocPrint = async () => {
        if (!letterRef.current || docLoading) return;

        try {
            setDocLoading(true);

            const letterHTML = letterRef.current.innerHTML;

            const documentHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        @page {
                            size: A4;
                            margin: 20mm;
                        }

                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            color: #111111;
                            line-height: 1.45;
                            font-size: 10.5pt;
                            margin: 0;
                        }

                        p {
                            margin: 0 0 14px 0;
                        }

                        img {
                            max-width: 100%;
                        }
                    </style>
                </head>
                <body>
                    ${letterHTML}
                </body>
                </html>
            `;

            const blob = new Blob(
                ["\ufeff", documentHTML],
                { type: "application/msword" }
            );

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");

            anchor.href = url;
            anchor.download = getFileName("doc");

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("DOC generation error:", error);
            alert("Failed to generate DOC file.");
        } finally {
            setDocLoading(false);
        }
    };

    const handlePdfPrint = async () => {
        if (!letterRef.current || pdfLoading) return;

        try {
            setPdfLoading(true);

            const pdfBlob = await generatePdfBlob();
            const fileName = getFileName("pdf");

            const pdfFile = new File(
                [pdfBlob],
                fileName,
                { type: "application/pdf" }
            );

            const url = URL.createObjectURL(pdfBlob);
            const anchor = document.createElement("a");

            anchor.href = url;
            anchor.download = fileName;

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(url);

            if (selectedUser?._id) {
                const assignFormData = new FormData();

                assignFormData.append("userId", selectedUser._id);
                assignFormData.append("type", "Termination");
                assignFormData.append("file", pdfFile);

                const response = await assignLetter(assignFormData);

                if (!response?.success) {
                    console.error(
                        "Termination downloaded but assignment failed:",
                        response
                    );

                    alert(
                        response?.message ||
                        "PDF downloaded, but the Termination letter could not be assigned."
                    );

                    return;
                }

                console.log("Termination letter assigned successfully.");
            }
        } catch (error) {
            console.error("PDF generation error:", error);

            alert(
                error?.message ||
                "Failed to generate Termination PDF."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="w-full h-full min-h-0 flex flex-col">

            {/* TOP BAR */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">

                    {/* EMPLOYEE */}
                    <div className="w-full xl:max-w-md">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Select Employee
                        </label>

                        <select
                            value={selectedUser?._id || ""}
                            onFocus={loadPhoneBookUsers}
                            onClick={loadPhoneBookUsers}
                            onChange={handleUserSelect}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">
                                {usersLoading
                                    ? "Loading employees..."
                                    : "Select employee (optional)"}
                            </option>

                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.fullName ||
                                        user.name ||
                                        "Unknown"}

                                    {user.designation
                                        ? ` - ${user.designation}`
                                        : ""}

                                    {user.email
                                        ? ` (${user.email})`
                                        : ""}
                                </option>
                            ))}
                        </select>

                        <p className="mt-1 text-xs text-gray-500">
                            Employee selection is optional. Assignment happens only when PDF Print is clicked.
                        </p>
                    </div>

                    {/* SIGNATURE */}
                    <div className="w-full xl:max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Signature
                        </label>

                        {signature ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={signature}
                                    alt="Signature preview"
                                    className="h-11 object-contain border border-gray-200 rounded-lg p-1 bg-white"
                                />

                                <button
                                    type="button"
                                    onClick={removeSignature}
                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-50"
                            />
                        )}
                    </div>

                    {/* BUTTONS */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleDocPrint}
                            disabled={docLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                        >
                            {docLoading ? (
                                <Loader2 size={17} className="animate-spin" />
                            ) : (
                                <FileText size={17} />
                            )}

                            Doc Print
                        </button>

                        <button
                            type="button"
                            onClick={handlePdfPrint}
                            disabled={pdfLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {pdfLoading ? (
                                <Loader2 size={17} className="animate-spin" />
                            ) : (
                                <Download size={17} />
                            )}

                            PDF Print
                        </button>
                    </div>
                </div>

                {selectedUser && (
                    <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
                        Termination letter will be assigned to{" "}
                        <span className="font-semibold">
                            {selectedUser.fullName || selectedUser.name}
                        </span>{" "}
                        when PDF Print is clicked.
                    </div>
                )}
            </div>

            {/* FORM + PREVIEW */}
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">

                {/* FORM */}
                <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">
                            Termination Letter Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <Input
                                label="Issue Date"
                                name="issueDate"
                                type="date"
                                value={formData.issueDate}
                                onChange={handleChange}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title
                                </label>

                                <select
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Mr.">Mr.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Mrs.">Mrs.</option>
                                </select>
                            </div>

                            <Input
                                label="Employee Name"
                                name="candidateName"
                                value={formData.candidateName}
                                onChange={handleChange}
                                placeholder="Employee full name"
                            />

                            <Input
                                label="Designation"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                placeholder="Software Developer"
                            />

                            <Input
                                label="Department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="IT"
                            />

                            <Input
                                label="Termination Date"
                                name="terminationDate"
                                type="date"
                                value={formData.terminationDate}
                                onChange={handleChange}
                            />

                            <Input
                                label="Final Working Date"
                                name="finalWorkingDate"
                                type="date"
                                value={formData.finalWorkingDate}
                                onChange={handleChange}
                            />

                            <Input
                                label="Notice Period"
                                name="noticePeriod"
                                value={formData.noticePeriod}
                                onChange={handleChange}
                                placeholder="As per company policy"
                            />

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason for Termination
                                </label>

                                <textarea
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Enter the reason for termination"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <Input
                                label="Authorized Person Name"
                                name="authorizedPersonName"
                                value={formData.authorizedPersonName}
                                onChange={handleChange}
                                placeholder="Authorized Person Name"
                            />

                            <Input
                                label="Authorized Person Designation"
                                name="authorizedDesignation"
                                value={formData.authorizedDesignation}
                                onChange={handleChange}
                                placeholder="Director"
                            />
                        </div>
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="min-h-0 overflow-y-auto overflow-x-auto">
                    <div
                        ref={letterRef}
                        style={{
                            width: "794px",
                            height: "1123px",
                            minHeight: "1123px",
                            boxSizing: "border-box",
                            margin: "0 auto",
                            padding: "78px 78px 62px",
                            fontFamily: "Arial, Helvetica, sans-serif",
                            fontSize: "14px",
                            lineHeight: "1.45",
                            backgroundColor: "#ffffff",
                            color: "#111111",
                            fontWeight: "600",
                            overflow: "hidden",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
                        }}
                    >
                        {/* HEADER */}
                        <div style={{ marginBottom: "28px" }}>
                            <img
                                src={iArtLogo}
                                alt="iART Technologies"
                                style={{
                                    width: "365px",
                                    height: "auto",
                                    display: "block",
                                }}
                            />
                        </div>

                        {/* TITLE */}
                        <h1
                            style={{
                                fontSize: "28px",
                                lineHeight: "1.1",
                                fontWeight: "700",
                                textAlign: "center",
                                margin: "0 0 28px",
                                textTransform: "uppercase",
                            }}
                        >
                            TERMINATION LETTER
                        </h1>

                        {/* DATE */}
                        <p style={{ margin: "0 0 30px" }}>
                            Date:{" "}
                            {formData.issueDate
                                ? formatDate(formData.issueDate)
                                : "[DD/MM/YYYY]"}
                        </p>

                        {/* EMPLOYEE */}
                        <p style={{ margin: "0 0 22px" }}>
                            To,{" "}
                            <strong>
                                {formData.title}{" "}
                                {formData.candidateName || "[Employee Full Name]"}
                            </strong>
                            <br />
                            {formData.designation || "[Designation]"}
                            {formData.department
                                ? `, ${formData.department}`
                                : ""}
                        </p>

                        {/* SUBJECT */}
                        <p style={{ margin: "0 0 22px" }}>
                            <strong>
                                Subject: Termination of Employment
                            </strong>
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            Dear{" "}
                            <strong>
                                {formData.title}{" "}
                                {formData.candidateName || "[Employee Full Name]"},
                            </strong>
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            This letter is to formally notify you that your employment
                            with IART Technologies Private Limited is being terminated
                            with effect from{" "}
                            <strong>
                                {formData.terminationDate
                                    ? formatDate(formData.terminationDate)
                                    : "[Termination Date]"}
                            </strong>
                            .
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            The decision has been made in accordance with the terms and
                            conditions of your employment and applicable company policies.
                            The reason for termination is{" "}
                            <strong>
                                {formData.reason || "[Reason for Termination]"}
                            </strong>
                            .
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            Your final working day will be{" "}
                            <strong>
                                {formData.finalWorkingDate
                                    ? formatDate(formData.finalWorkingDate)
                                    : "[Final Working Date]"}
                            </strong>
                            . Your notice period will be{" "}
                            <strong>
                                {formData.noticePeriod || "as per company policy"}
                            </strong>
                            , subject to the terms of your employment and applicable
                            company policies.
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            You are requested to complete all pending responsibilities
                            and hand over company property, documents, access credentials,
                            and other assigned assets before your final working day.
                            Any applicable full and final settlement will be processed
                            in accordance with company policy and applicable requirements.
                        </p>

                        <p style={{ margin: "0 0 18px" }}>
                            Your obligations relating to confidentiality, intellectual
                            property, company information, and other continuing
                            responsibilities under your employment terms will remain
                            applicable after the termination of your employment.
                        </p>

                        <p style={{ margin: "0 0 28px" }}>
                            We thank you for your services during your association with
                            IART Technologies Private Limited and wish you the best for
                            your future endeavors.
                        </p>

                        {/* SIGNATORY */}
                        <div style={{ marginTop: "10px" }}>
                            <p style={{ margin: "0 0 22px" }}>
                                For IART Technologies Private Limited
                            </p>

                            {signature && (
                                <img
                                    src={signature}
                                    alt="Authorized signature"
                                    style={{
                                        width: "200px",
                                        maxWidth: "500px",
                                        height: "42px",
                                        objectFit: "contain",
                                        objectPosition: "left center",
                                        display: "block",
                                        marginTop: "10px",
                                    }}
                                />
                            )}

                            <p style={{ margin: "0 0 2px" }}>
                                Authorized Signatory
                            </p>

                            <p style={{ margin: "0 0 2px" }}>
                                Name:{" "}
                                {formData.authorizedPersonName ||
                                    "[Authorized Person Name]"}
                            </p>

                            <p style={{ margin: "0" }}>
                                Designation:{" "}
                                {formData.authorizedDesignation || "[Designation]"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Input = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder = "",
    readOnly = false,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 read-only:bg-gray-50"
            />
        </div>
    );
};
