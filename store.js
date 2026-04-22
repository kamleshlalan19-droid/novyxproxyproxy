export const parseUserData = (rawData) => {
    if (!rawData) {
        return {};
    }

    if (typeof rawData === "object") {
        return rawData;
    }

    try {
        return JSON.parse(rawData);
    } catch {
        return {};
    }
};

export const roundCredits = (value) => {
    return Math.round((Number(value) || 0) * 100) / 100;
};

export const getCreditBalance = (rawData) => {
    const parsed = parseUserData(rawData);
    return roundCredits(parsed.credits ?? 0);
};

export const setCreditBalance = (rawData, credits) => {
    const parsed = parseUserData(rawData);
    parsed.credits = roundCredits(credits);
    return JSON.stringify(parsed);
};
