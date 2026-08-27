const TYPE_CODES = {
    DOM: "DOM",
    "DOM - DOMESTIC INVOICE": "DOM",

    INT: "INT",
    "INT - INTERNATIONAL INVOICE": "INT",
};

const SERVICE_CODES = {
    CS: "CS",
    "CS - CONSULTANCY SERVICES": "CS",

    DS: "DS",
    "DS - DIGISHOP": "DS",

    IT: "IT",
    "IT - IT SERVICES": "IT",

    MS: "MS",
    "MS - MANAGEMENT SERVICES": "MS",
};

export const getTypeCode = (type) => {
    if (!type) return "";

    const normalized = type.trim().toUpperCase();

    return TYPE_CODES[normalized] || normalized;
};

export const getServiceCode = (service) => {
    if (!service) return "";

    const normalized = service.trim().toUpperCase();

    return SERVICE_CODES[normalized] || normalized;
};

export const generateInvoiceNumber = ({
    type,
    service,
    invoiceDate,
    serial,
}) => {
    const typeCode = getTypeCode(type);
    const serviceCode = getServiceCode(service);

    const date = new Date(invoiceDate);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return `IART-${typeCode}-${serviceCode}-${month}${year}-${serial}`;
};