import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";

import { getPhoneBook, assignLetter } from "../../api/authApi";
import iArtLogo from "../../assets/logoiart.svg";

export const Appointment = () => {
    const letterRef = useRef(null);

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersLoaded, setUsersLoaded] = useState(false);

    const [pdfLoading, setPdfLoading] = useState(false);
    const [docLoading, setDocLoading] = useState(false);

    const [signature, setSignature] = useState(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],

        candidateName: "",
        candidateAddress: "",
        city: "",
        state: "",
        pinCode: "",

        designation: "",
        department: "",
        reportingTo: "",

        joiningDate: "",
        reportingTime: "10:00 AM",
        workLocation:
            "IART Technologies Private Limited, SCO 13, Second Floor, Model Town Market, Sector 126, Mohali, Punjab.",

        probationPeriod: "3",

        workingDays: "Monday to Friday",
        workingHours: "10:00 AM to 7:00 PM",

        probationNoticePeriod: "30",
        confirmationNoticePeriod: "90",

        monthlySalary: "",

        basicSalaryPercentage: "50",
        hraPercentage: "20",
        conveyanceAllowancePercentage: "10",
        specialAllowancePercentage: "20",
        otherComponentsPercentage: "0",

        employerContributionPercentage: "0",
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
        reader.onload = () => setSignature(reader.result);
        reader.readAsDataURL(file);
    };

    const removeSignature = () => setSignature(null);

    const formatDate = (date) => {
        if (!date) return "DD/MM/YYYY";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        return d.toLocaleDateString("en-GB");
    };

    const formatCurrency = (amount) => {
        const value = Number(amount || 0);
        return value.toLocaleString("en-IN");
    };

    const monthlySalary = Number(formData.monthlySalary || 0);

    const calculatePercentageAmount = (percentage) => {
        return (monthlySalary * Number(percentage || 0)) / 100;
    };

    const salaryComponents = {
        basic: calculatePercentageAmount(formData.basicSalaryPercentage),
        hra: calculatePercentageAmount(formData.hraPercentage),
        conveyance: calculatePercentageAmount(
            formData.conveyanceAllowancePercentage
        ),
        special: calculatePercentageAmount(
            formData.specialAllowancePercentage
        ),
        other: calculatePercentageAmount(
            formData.otherComponentsPercentage
        ),
        employer: calculatePercentageAmount(
            formData.employerContributionPercentage
        ),
    };

    const grossFromComponents =
        salaryComponents.basic +
        salaryComponents.hra +
        salaryComponents.conveyance +
        salaryComponents.special +
        salaryComponents.other;

    const totalMonthlyCTC =
        grossFromComponents + salaryComponents.employer;

    const annualSalary = monthlySalary * 12;

    const totalCTC = totalMonthlyCTC * 12;

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
            candidateAddress:
                employee.address ||
                employee.currentAddress ||
                prev.candidateAddress,
            city:
                employee.city ||
                employee.currentLocation?.city ||
                prev.city,
            state:
                employee.state ||
                employee.currentLocation?.state ||
                prev.state,
            pinCode:
                employee.pinCode ||
                employee.pincode ||
                employee.zipCode ||
                prev.pinCode,
            designation:
                employee.designation || prev.designation,
            department:
                employee.department || prev.department,
            workLocation:
                employee.workLocation ||
                prev.workLocation,
        }));
    };

    const getFileName = (extension) => {
        const candidate =
            formData.candidateName?.trim() || "Candidate";

        const safeName = candidate
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "_");

        return `Appointment_Letter_${safeName}.${extension}`;
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
@page { size: A4; margin: 18mm 20mm; }
body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
    line-height: 1.45;
    font-size: 10.5pt;
}
p { margin: 6px 0; }
h1, h2, h3 { color: #111827; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 5px; }
</style>
</head>
<body>${letterHTML}</body>
</html>`;

            const blob = new Blob(["\ufeff", documentHTML], {
                type: "application/msword",
            });

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

    const generatePdfBlob = async () => {
        if (!letterRef.current) {
            throw new Error("Appointment letter preview not found.");
        }

        const source = letterRef.current;

        const PAGE_WIDTH_PX = 794;
        const PAGE_HEIGHT_PX = 1123;

        const PAGE_PADDING_TOP = 62;
        const PAGE_PADDING_RIGHT = 70;
        const PAGE_PADDING_BOTTOM = 62;
        const PAGE_PADDING_LEFT = 70;

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const waitForImages = async (root) => {
            const images = Array.from(root.querySelectorAll("img"));

            await Promise.all(
                images.map((img) => {
                    if (img.complete) return Promise.resolve();

                    return new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            );
        };

        await waitForImages(source);

        const renderHost = document.createElement("div");

        Object.assign(renderHost.style, {
            position: "fixed",
            left: "-100000px",
            top: "0",
            width: `${PAGE_WIDTH_PX}px`,
            background: "#ffffff",
            zIndex: "-9999",
            pointerEvents: "none",
        });

        document.body.appendChild(renderHost);

        const pages = [];

        const createPage = () => {
            const page = document.createElement("div");

            Object.assign(page.style, {
                width: `${PAGE_WIDTH_PX}px`,
                height: `${PAGE_HEIGHT_PX}px`,
                boxSizing: "border-box",
                overflow: "hidden",
                padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_RIGHT}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_LEFT}px`,
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "12.5px",
                lineHeight: "1.42",
                backgroundColor: "#ffffff",
                color: "#111111",
            });

            renderHost.appendChild(page);
            pages.push(page);

            return page;
        };

        let currentPage = createPage();

        const overflows = (page) =>
            page.scrollHeight > page.clientHeight + 1;

        const sourceChildren = Array.from(source.children);

        for (let index = 0; index < sourceChildren.length; index += 1) {
            const original = sourceChildren[index];
            const forcePageBreak =
                original.dataset?.pageBreakBefore === "true";

            if (
                forcePageBreak &&
                currentPage.children.length > 0
            ) {
                currentPage = createPage();
            }

            const clone = original.cloneNode(true);

            clone.style.breakInside = "avoid";
            clone.style.pageBreakInside = "avoid";

            currentPage.appendChild(clone);

            if (
                overflows(currentPage) &&
                currentPage.children.length > 1
            ) {
                currentPage.removeChild(clone);
                currentPage = createPage();
                currentPage.appendChild(clone);
            }
        }

        try {
            await waitForImages(renderHost);

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
                const page = pages[pageIndex];

                const canvas = await html2canvas(page, {
                    scale: 2,
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

                const imgData = canvas.toDataURL("image/jpeg", 0.96);

                if (pageIndex > 0) {
                    pdf.addPage();
                }

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
            }

            return pdf.output("blob");
        } finally {
            renderHost.remove();
        }
    };

    const handlePdfPrint = async () => {
        if (!letterRef.current || pdfLoading) return;

        try {
            setPdfLoading(true);

            const pdfBlob = await generatePdfBlob();
            const fileName = getFileName("pdf");

            const pdfFile = new File([pdfBlob], fileName, {
                type: "application/pdf",
            });

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
                assignFormData.append("type", "appointment");
                assignFormData.append("file", pdfFile);

                const response = await assignLetter(assignFormData);

                if (!response?.success) {
                    console.error(
                        "Letter downloaded but assignment failed:",
                        response
                    );

                    alert(
                        response?.message ||
                        "PDF downloaded, but the appointment letter could not be assigned."
                    );

                    return;
                }

                console.log(
                    "Appointment letter assigned successfully."
                );
            }
        } catch (error) {
            console.error("PDF generation error:", error);

            alert(
                error?.message ||
                "Failed to generate PDF."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="w-full h-full min-h-0 flex flex-col">
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
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
                                <option
                                    key={user._id}
                                    value={user._id}
                                >
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

                        <p className="mt-1 text-xs text-gray-500">
                            Appears below Authorized Signatory.
                        </p>
                    </div>

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
                        Appointment letter will be assigned to{" "}
                        <span className="font-semibold">
                            {selectedUser.fullName || selectedUser.name}
                        </span>{" "}
                        when PDF Print is clicked.
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4 overflow-hidden">
                <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <h2 className="text-base font-semibold text-gray-800 mb-4">
                            Appointment Letter Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Letter Date"
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                            />

                            <Input
                                label="Candidate Name"
                                name="candidateName"
                                value={formData.candidateName}
                                onChange={handleChange}
                                placeholder="Employee full name"
                            />

                            <Input
                                label="Candidate Address"
                                name="candidateAddress"
                                value={formData.candidateAddress}
                                onChange={handleChange}
                                placeholder="Employee address"
                            />

                            <Input
                                label="City"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                            />

                            <Input
                                label="State"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                            />

                            <Input
                                label="PIN Code"
                                name="pinCode"
                                value={formData.pinCode}
                                onChange={handleChange}
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
                                label="Reporting To"
                                name="reportingTo"
                                value={formData.reportingTo}
                                onChange={handleChange}
                                placeholder="Reporting Manager / Department Head"
                            />

                            <Input
                                label="Date of Joining"
                                type="date"
                                name="joiningDate"
                                value={formData.joiningDate}
                                onChange={handleChange}
                            />

                            <Input
                                label="Reporting Time"
                                name="reportingTime"
                                value={formData.reportingTime}
                                onChange={handleChange}
                                placeholder="10:00 AM"
                            />

                            <Input
                                label="Work Location"
                                name="workLocation"
                                value={formData.workLocation}
                                onChange={handleChange}
                                placeholder="Office / Client / Remote"
                            />

                            <Input
                                label="Monthly Gross Salary"
                                type="number"
                                name="monthlySalary"
                                value={formData.monthlySalary}
                                onChange={handleChange}
                                placeholder="50000"
                            />

                            <SelectInput
                                label="Probation Period"
                                name="probationPeriod"
                                value={formData.probationPeriod}
                                onChange={handleChange}
                                options={[
                                    ["3", "3 Months"],
                                    ["6", "6 Months"],
                                ]}
                            />

                            <Input
                                label="Working Days"
                                name="workingDays"
                                value={formData.workingDays}
                                onChange={handleChange}
                                placeholder="Monday to Friday"
                            />

                            <Input
                                label="Working Hours"
                                name="workingHours"
                                value={formData.workingHours}
                                onChange={handleChange}
                                placeholder="10:00 AM to 7:00 PM"
                            />

                            <Input
                                label="Probation Notice Period (Days)"
                                type="number"
                                name="probationNoticePeriod"
                                value={formData.probationNoticePeriod}
                                onChange={handleChange}
                            />

                            <SelectInput
                                label="Notice Period After Confirmation"
                                name="confirmationNoticePeriod"
                                value={formData.confirmationNoticePeriod}
                                onChange={handleChange}
                                options={[
                                    ["30", "30 Days"],
                                    ["60", "60 Days"],
                                    ["90", "90 Days"],
                                ]}
                            />
                        </div>

                        <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-3">
                            Annexure A — Salary Structure
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Basic */}
                            <Input
                                label="Basic Salary (%)"
                                type="number"
                                name="basicSalaryPercentage"
                                value={formData.basicSalaryPercentage}
                                onChange={handleChange}
                                placeholder="50"
                            />

                            {/* HRA */}
                            <Input
                                label="HRA (%)"
                                type="number"
                                name="hraPercentage"
                                value={formData.hraPercentage}
                                onChange={handleChange}
                                placeholder="20"
                            />

                            {/* Conveyance */}
                            <Input
                                label="Conveyance / Other Allowance (%)"
                                type="number"
                                name="conveyanceAllowancePercentage"
                                value={formData.conveyanceAllowancePercentage}
                                onChange={handleChange}
                                placeholder="10"
                            />

                            {/* Special */}
                            <Input
                                label="Special Allowance (%)"
                                type="number"
                                name="specialAllowancePercentage"
                                value={formData.specialAllowancePercentage}
                                onChange={handleChange}
                                placeholder="15"
                            />

                            {/* Other */}
                            <Input
                                label="Other Components (%)"
                                type="number"
                                name="otherComponentsPercentage"
                                value={formData.otherComponentsPercentage}
                                onChange={handleChange}
                                placeholder="5"
                            />

                            {/* Employer Contribution */}
                            <Input
                                label="Employer Contribution (%)"
                                type="number"
                                name="employerContributionPercentage"
                                value={formData.employerContributionPercentage}
                                onChange={handleChange}
                                placeholder="0"
                            />
                        </div>

                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            {/* <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700">
                                    Total Monthly Salary
                                </span>

                                <span className="font-bold text-blue-700">
                                    ₹{formatCurrency(monthlySalary)}
                                </span>
                            </div> */}

                            <div className="flex justify-between text-sm mt-2">
                                <span className="font-medium text-gray-700">
                                    Total Monthly CTC
                                </span>

                                <span className="font-bold text-blue-700">
                                    ₹{formatCurrency(totalMonthlyCTC)}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm mt-2">
                                <span className="font-medium text-gray-700">
                                    Annual CTC
                                </span>

                                <span className="font-bold text-blue-700">
                                    ₹{formatCurrency(totalCTC)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 overflow-y-auto overflow-x-auto">
                    <div
                        ref={letterRef}
                        style={{
                            width: "794px",
                            minHeight: "1123px",
                            margin: "0 auto",
                            padding: "62px 70px 62px",
                            boxSizing: "border-box",
                            fontFamily: "Arial, Helvetica, sans-serif",
                            fontSize: "13px",
                            lineHeight: "1.45",
                            backgroundColor: "#ffffff",
                            color: "#111827",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
                        }}
                    >
                        <div style={{ marginBottom: "20px" }}>
                            <img
                                src={iArtLogo}
                                alt="iART Technologies"
                                style={{
                                    width: "250px",
                                    height: "auto",
                                    display: "block",
                                    marginBottom: "18px",
                                }}
                            />

                            <h1
                                style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    margin: 0,
                                }}
                            >
                                IART TECHNOLOGIES PRIVATE LIMITED
                            </h1>

                            <p style={{ fontSize: "13px", fontWeight: "700", margin: "3px 0" }}>
                                SCO 13, Second Floor, Model Town Market, Sector 126, Mohali, Punjab
                            </p>

                            <p style={{ fontSize: "13px", fontWeight: "700", margin: "3px 0" }}>
                                Email: contact@iarttechnologies.com
                            </p>
                        </div>

                        <hr
                            style={{
                                margin: "16px 0",
                                border: 0,
                                borderTop: "1px solid #999",
                            }}
                        />

                        <h2
                            style={{
                                textAlign: "center",
                                fontSize: "28px",
                                fontWeight: "700",
                                margin: "0 0 18px",
                                textTransform: "uppercase",
                            }}
                        >
                            APPOINTMENT LETTER
                        </h2>

                        <p>
                            <strong>Date:</strong>{" "}
                            {formatDate(formData.date)}
                        </p>

                        <div style={{ marginTop: "12px" }}>
                            <strong>To,</strong>

                            <div>
                                <strong>
                                    {formData.candidateName || "[Employee Full Name]"}
                                </strong>
                            </div>

                            <div>
                                {formData.candidateAddress || "[Employee Address]"}
                            </div>

                            <div>
                                {[
                                    formData.city,
                                    formData.state,
                                    formData.pinCode,
                                ]
                                    .filter(Boolean)
                                    .join(", ") ||
                                    "[City, State, PIN Code]"}
                            </div>
                        </div>

                        <p style={{ marginTop: "16px", fontWeight: "700" }}>
                            Subject: Appointment as{" "}
                            {formData.designation || "[Designation]"}
                        </p>

                        <p>
                            Dear{" "}
                            <strong>
                                {formData.candidateName || "[Employee Name]"}
                            </strong>
                            ,
                        </p>

                        <p>
                            We are pleased to offer you an appointment with{" "}
                            <strong>IART Technologies Private Limited</strong>{" "}
                            as{" "}
                            <strong>
                                {formData.designation || "[Designation]"}
                            </strong>
                            , effective from{" "}
                            <strong>
                                {formatDate(formData.joiningDate)}
                            </strong>
                            .
                        </p>

                        <p>
                            Based on your qualifications, experience, skills, and
                            performance during the selection process, we believe that
                            you will be a valuable addition to our organization.
                        </p>

                        <p>
                            Your employment with the Company will be governed by the
                            following terms and conditions:
                        </p>

                        <SectionTitle>1. Designation and Department</SectionTitle>

                        <p>
                            You are appointed as{" "}
                            <strong>
                                {formData.designation || "[Designation]"}
                            </strong>{" "}
                            in the{" "}
                            <strong>
                                {formData.department || "[Department]"}
                            </strong>{" "}
                            department.
                        </p>

                        <p>
                            You will report to{" "}
                            <strong>
                                {formData.reportingTo ||
                                    "[Reporting Manager/Department Head]"}
                            </strong>{" "}
                            or to any other person designated by the management from
                            time to time.
                        </p>

                        <SectionTitle>2. Date of Joining</SectionTitle>

                        <p>
                            Your date of joining will be{" "}
                            <strong>
                                {formatDate(formData.joiningDate)}
                            </strong>
                            .
                        </p>

                        <p>
                            You are required to report to the Company at{" "}
                            <strong>
                                {formData.reportingTime || "[Reporting Time]"}
                            </strong>{" "}
                            on your joining date.
                        </p>

                        <SectionTitle>3. Place of Work</SectionTitle>

                        <p>Your initial place of work will be:</p>

                        <p>
                            <strong>IART Technologies Private Limited</strong>
                            <br />
                            {formData.workLocation ||
                                "SCO 13, Second Floor, Model Town Market, Sector 126, Mohali, Punjab."}
                        </p>

                        <p>
                            However, depending upon business requirements, you may be
                            required to work from another location, client premises, or
                            remotely as determined by the Company.
                        </p>

                        <SectionTitle>4. Compensation</SectionTitle>

                        <p>
                            Your total compensation will be{" "}
                            <strong>
                                ₹{formatCurrency(totalCTC)}
                            </strong>{" "}
                            per annum, payable on a monthly basis in accordance with the
                            Company's payroll policies.
                        </p>

                        <p>
                            Your detailed salary structure is provided in Annexure A
                            attached to this appointment letter.
                        </p>

                        <p>
                            The Company may make statutory deductions and other applicable
                            deductions from your salary in accordance with applicable laws
                            and Company policies.
                        </p>

                        <SectionTitle>5. Probation</SectionTitle>

                        <p>
                            You will be on probation for a period of{" "}
                            <strong>
                                {formData.probationPeriod || "[3/6]"} months
                            </strong>{" "}
                            from your date of joining.
                        </p>

                        <p>
                            During the probation period, your performance, conduct,
                            attendance, technical skills, and suitability for the
                            assigned role will be evaluated.
                        </p>

                        <p>
                            The Company may extend the probation period if your performance
                            or conduct requires further evaluation.
                        </p>

                        <p>
                            Upon satisfactory completion of probation, your employment may
                            be confirmed in writing by the Company.
                        </p>

                        <SectionTitle>6. Working Hours</SectionTitle>

                        <p>Your normal working hours will be:</p>

                        <p>
                            <strong>
                                {formData.workingDays || "Monday to Friday"}:{" "}
                                {formData.workingHours || "10:00 AM to 7:00 PM"}
                            </strong>
                        </p>

                        <p>
                            You may occasionally be required to work beyond normal working
                            hours depending upon project requirements, deadlines, client
                            commitments, or other business requirements.
                        </p>

                        <SectionTitle>7. Duties and Responsibilities</SectionTitle>

                        <p>
                            You shall perform the duties and responsibilities associated
                            with your designation and any other reasonable duties assigned
                            by the management from time to time.
                        </p>

                        <p>
                            You are expected to perform your responsibilities professionally,
                            efficiently, and in the best interests of the Company.
                        </p>

                        <SectionTitle>8. Leave and Holidays</SectionTitle>

                        <p>
                            You will be entitled to leave and holidays in accordance with
                            the Company's leave policy and applicable laws.
                        </p>

                        <p>
                            All leaves must be applied for and approved by the appropriate
                            reporting manager before being availed, except in genuine
                            emergency situations.
                        </p>

                        <SectionTitle>9. Confidentiality</SectionTitle>

                        <p>
                            During your employment, you may have access to confidential
                            information relating to the Company's business, clients,
                            products, technology, source code, databases, financial
                            information, strategies, processes, and intellectual property.
                        </p>

                        <p>
                            You shall maintain strict confidentiality regarding such
                            information and shall not disclose, copy, misuse, or share it
                            with any unauthorized person during or after your employment.
                        </p>

                        <p>
                            As a condition of employment, you may be required to execute a
                            separate Confidentiality and Intellectual Property Agreement.
                        </p>

                        <SectionTitle>10. Intellectual Property</SectionTitle>

                        <p>
                            Any software, source code, designs, documents, inventions,
                            developments, processes, ideas, concepts, or other intellectual
                            property created or developed by you in connection with your
                            employment or using Company resources shall be governed by the
                            Company's Intellectual Property policies and applicable
                            agreements.
                        </p>

                        <p>
                            You agree to execute any documents reasonably required to
                            establish and protect the Company's rights in such intellectual
                            property.
                        </p>

                        <SectionTitle>11. Company Policies</SectionTitle>

                        <p>
                            You are required to comply with all rules, regulations, policies,
                            procedures, security requirements, and instructions issued by
                            the Company from time to time.
                        </p>

                        <p>
                            Violation of Company policies may result in disciplinary action,
                            up to and including termination of employment, subject to
                            applicable law.
                        </p>

                        <SectionTitle>12. Conflict of Interest</SectionTitle>

                        <p>
                            During your employment, you shall not undertake any employment,
                            consultancy, freelancing, business activity, or other
                            professional engagement that conflicts with your responsibilities
                            to the Company without prior written approval from the Company.
                        </p>

                        <SectionTitle>13. Termination of Employment</SectionTitle>

                        <p>
                            During probation, either you or the Company may terminate the
                            employment by providing{" "}
                            <strong>
                                {formData.probationNoticePeriod || "[Notice Period]"} days'
                                written notice
                            </strong>{" "}
                            or salary in lieu of notice, subject to applicable Company
                            policy and law.
                        </p>

                        <p>
                            After confirmation, the applicable notice period will be{" "}
                            <strong>
                                {formData.confirmationNoticePeriod || "[30/60/90]"} days
                            </strong>
                            , unless otherwise specified in writing.
                        </p>

                        <p>
                            The Company reserves the right to terminate employment without
                            notice in cases involving serious misconduct, fraud, breach of
                            confidentiality, violation of Company policies, or other grounds
                            permitted by applicable law.
                        </p>

                        <SectionTitle>14. Background Verification</SectionTitle>

                        <p>
                            Your appointment is subject to satisfactory verification of the
                            information and documents provided by you during the recruitment
                            process.
                        </p>

                        <p>
                            If any information or document submitted by you is found to be
                            false, misleading, incomplete, or materially inaccurate, the
                            Company may take appropriate action, including termination of
                            employment.
                        </p>

                        <SectionTitle>15. Documents Required</SectionTitle>

                        <p>
                            You are required to provide the following documents at the time
                            of joining, as applicable:
                        </p>

                        <ul style={{ marginTop: "4px", marginBottom: "8px", paddingLeft: "22px" }}>
                            <li>Aadhaar Card</li>
                            <li>PAN Card</li>
                            <li>Educational qualification certificates</li>
                            <li>Previous employment documents, if applicable</li>
                            <li>Bank account details</li>
                            <li>Passport-size photographs</li>
                            <li>Address proof</li>
                            <li>Any other documents required by the Company</li>
                        </ul>

                        <SectionTitle>16. Code of Conduct</SectionTitle>

                        <p>
                            You are expected to maintain professional conduct, integrity,
                            punctuality, and discipline at all times and to maintain
                            respectful behavior toward colleagues, clients, partners, and
                            other stakeholders.
                        </p>

                        <SectionTitle>17. Acceptance of Appointment</SectionTitle>

                        <p>
                            Please sign and return a copy of this letter as confirmation that
                            you have read, understood, and accepted the terms and conditions
                            of your appointment.
                        </p>

                        <p>
                            We welcome you to{" "}
                            <strong>IART Technologies Private Limited</strong>{" "}
                            and look forward to your contribution and growth with the
                            organization.
                        </p>

                        <p>
                            We wish you a successful and rewarding career with us.
                        </p>

                        <div style={{ marginTop: "22px" }}>
                            <p style={{ margin: "4px 0" }}>
                                Sincerely,
                            </p>

                            <p style={{ margin: "4px 0" }}>
                                <strong>
                                    For IART Technologies Private Limited
                                </strong>
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
                            <p style={{ margin: "10px 0" }}>
                                <strong>Authorized Signatory</strong>
                            </p>

                            <p style={{ margin: "4px 0 10px 0" }}>
                                <strong>Date:</strong>{" "}
                                {formatDate(formData.date)}
                            </p>

                        </div>

                        <hr
                            style={{
                                margin: "20px 0 16px",
                                border: 0,
                                borderTop: "1px solid #999",
                            }}
                        />

                        <h2
                            style={{
                                textAlign: "left",
                                fontSize: "18px",
                                fontWeight: "700",
                                margin: "0 0 10px",
                            }}
                        >
                            EMPLOYEE ACCEPTANCE
                        </h2>

                        <p>
                            I,{" "}
                            <strong>
                                {formData.candidateName || "[Employee Full Name]"}
                            </strong>
                            , hereby confirm that I have read and understood the terms and
                            conditions mentioned in this Appointment Letter and agree to
                            abide by the policies, rules, and regulations of IART
                            Technologies Private Limited.
                        </p>

                        <div style={{ marginTop: "14px" }}>
                            <p style={{ margin: "6px 0" }}>
                                <strong>Employee Name:</strong>{" "}
                                {formData.candidateName || "[Employee Full Name]"}
                            </p>

                            <p style={{ margin: "6px 0" }}>
                                <strong>Signature:</strong>{" "}
                                __________________________
                            </p>

                            <p style={{ margin: "6px 0" }}>
                                <strong>Date:</strong>{" "}
                                __________________________
                            </p>
                        </div>

                        <hr
                            style={{
                                margin: "20px 0 16px",
                                border: 0,
                                borderTop: "1px solid #999",
                            }}
                        />

                        <div data-page-break-before="true">
                            <h2
                                style={{
                                    textAlign: "center",
                                    fontSize: "17px",
                                    fontWeight: "700",
                                    margin: "0 0 12px",
                                }}
                            >
                                ANNEXURE A – SALARY STRUCTURE
                            </h2>

                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "12px",
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th style={cellStyle}>Component</th>
                                        {/* <th style={{ ...cellStyle, textAlign: "center" }}>
                                            %
                                        </th> */}
                                        <th style={{ ...cellStyle, textAlign: "right" }}>
                                            Monthly (₹)
                                        </th>
                                        <th style={{ ...cellStyle, textAlign: "right" }}>
                                            Annual (₹)
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>

                                    <SalaryRow
                                        label="Basic Salary"
                                        percentage={formData.basicSalaryPercentage}
                                        monthly={salaryComponents.basic}
                                    />

                                    <SalaryRow
                                        label="House Rent Allowance (HRA)"
                                        percentage={formData.hraPercentage}
                                        monthly={salaryComponents.hra}
                                    />

                                    <SalaryRow
                                        label="Conveyance / Other Allowance"
                                        percentage={formData.conveyanceAllowancePercentage}
                                        monthly={salaryComponents.conveyance}
                                    />

                                    <SalaryRow
                                        label="Special Allowance"
                                        percentage={formData.specialAllowancePercentage}
                                        monthly={salaryComponents.special}
                                    />

                                    <SalaryRow
                                        label="Other Components"
                                        percentage={formData.otherComponentsPercentage}
                                        monthly={salaryComponents.other}
                                    />

                                    <SalaryRow
                                        label="Gross Salary"
                                        percentage=""
                                        monthly={grossFromComponents}
                                        bold
                                    />

                                    <SalaryRow
                                        label="Employer Contributions"
                                        percentage={formData.employerContributionPercentage}
                                        monthly={salaryComponents.employer}
                                    />

                                    <SalaryRow
                                        label="Total CTC"
                                        percentage=""
                                        monthly={totalMonthlyCTC}
                                        bold
                                    />

                                </tbody>
                            </table>
                            <p style={{ fontSize: "11px", marginTop: "10px" }}>
                                <strong>Note:</strong> Salary components and statutory
                                contributions are subject to applicable laws and the Company's
                                payroll policies.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const cellStyle = {
    border: "1px solid #555",
    padding: "6px 7px",
    textAlign: "left",
};

const SalaryRow = ({
    label,
    percentage,
    monthly,
    bold = false,
    annualOverride,
}) => {
    const monthlyValue = Number(monthly || 0);

    const annualValue =
        annualOverride !== undefined
            ? Number(annualOverride || 0)
            : monthlyValue * 12;

    return (
        <tr>
            <td
                style={{
                    ...cellStyle,
                    fontWeight: bold ? "700" : "400",
                }}
            >
                {label}
            </td>

            {/* <td
                style={{
                    ...cellStyle,
                    textAlign: "center",
                    fontWeight: bold ? "700" : "400",
                }}
            >
                {percentage !== "" && percentage !== undefined
                    ? `${Number(percentage || 0)}%`
                    : "—"}
            </td> */}

            <td
                style={{
                    ...cellStyle,
                    textAlign: "right",
                    fontWeight: bold ? "700" : "400",
                }}
            >
                ₹{monthlyValue.toLocaleString("en-IN")}
            </td>

            <td
                style={{
                    ...cellStyle,
                    textAlign: "right",
                    fontWeight: bold ? "700" : "400",
                }}
            >
                ₹{annualValue.toLocaleString("en-IN")}
            </td>
        </tr>
    );
};

const Input = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder = "",
}) => (
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

const SelectInput = ({
    label,
    name,
    value,
    onChange,
    options,
}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>

        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {options.map(([optionValue, optionLabel]) => (
                <option key={optionValue} value={optionValue}>
                    {optionLabel}
                </option>
            ))}
        </select>
    </div>
);

const SectionTitle = ({ children }) => (
    <h2
        style={{
            fontSize: "14px",
            fontWeight: "700",
            marginTop: "16px",
            marginBottom: "6px",
        }}
    >
        {children}
    </h2>
);
