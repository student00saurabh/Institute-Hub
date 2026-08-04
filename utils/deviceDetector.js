// utils/deviceDetector.js

// ✅ Using Google Maps Geocoding API for accurate location
// Get your API key from: https://console.cloud.google.com/apis/credentials

async function getIPLocation(ip) {
    if (!ip || ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return { 
            city: 'Local', 
            country: 'Local', 
            countryCode: 'XX',
            region: 'Local',
            postalCode: '000000',
            timezone: 'UTC',
            isp: 'Local',
            latitude: 0,
            longitude: 0,
            accuracy: 'low'
        };
    }

    try {
        // ========== METHOD 1: ip-api.com (Free, No API Key) ==========
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`, {
            timeout: 5000
        });
        
        const data = await response.json();

        if (data && data.status === 'success') {
            return {
                city: data.city || 'Unknown',
                country: data.country || 'Unknown',
                countryCode: data.countryCode || 'XX',
                region: data.regionName || data.region || 'Unknown',
                postalCode: data.zip || 'Unknown',
                timezone: data.timezone || 'UTC',
                isp: data.isp || data.org || 'Unknown',
                asn: data.as || 'Unknown',
                latitude: data.lat || 0,
                longitude: data.lon || 0,
                mobile: data.mobile || false,
                proxy: data.proxy || false,
                hosting: data.hosting || false,
                accuracy: 'high'
            };
        }

        // ========== METHOD 2: Fallback - Google Maps API ==========
        // Uncomment if you have Google Maps API Key
        /*
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (googleApiKey) {
            const googleResponse = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lon}&key=${googleApiKey}`
            );
            const googleData = await googleResponse.json();
            if (googleData.status === 'OK') {
                // Parse address components
                const addressComponents = googleData.results[0]?.address_components || [];
                let city = 'Unknown', country = 'Unknown', region = 'Unknown';
                addressComponents.forEach(comp => {
                    if (comp.types.includes('locality')) city = comp.long_name;
                    if (comp.types.includes('administrative_area_level_1')) region = comp.long_name;
                    if (comp.types.includes('country')) country = comp.long_name;
                });
                return {
                    city, country, region,
                    countryCode: 'XX',
                    latitude: data.lat,
                    longitude: data.lon,
                    accuracy: 'google'
                };
            }
        }
        */

    } catch (error) {
        console.error('IP Location lookup failed:', error.message);
    }

    return { 
        city: 'Unknown', 
        country: 'Unknown', 
        countryCode: 'XX',
        region: 'Unknown',
        postalCode: 'Unknown',
        timezone: 'UTC',
        isp: 'Unknown',
        latitude: 0,
        longitude: 0,
        accuracy: 'low'
    };
}

function detectDevice(userAgent) {
    if (!userAgent) return { deviceType: 'other', browser: 'Unknown', os: 'Unknown', networkType: 'unknown' };

    const ua = userAgent.toLowerCase();
    const result = {
        deviceType: 'desktop',
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
        networkType: 'unknown',
        deviceModel: 'Unknown',
        deviceVendor: 'Unknown'
    };

    // ========== DEVICE TYPE ==========
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
        if (/tablet|ipad/i.test(ua)) {
            result.deviceType = 'tablet';
        } else {
            result.deviceType = 'mobile';
        }
    }

    // ========== OS DETECTION ==========
    if (ua.includes('windows')) {
        result.os = 'Windows';
        if (ua.includes('windows nt 10.0')) result.osVersion = '10';
        else if (ua.includes('windows nt 6.3')) result.osVersion = '8.1';
        else if (ua.includes('windows nt 6.2')) result.osVersion = '8';
        else if (ua.includes('windows nt 6.1')) result.osVersion = '7';
    } else if (ua.includes('mac os x')) {
        result.os = 'macOS';
        const match = ua.match(/mac os x (\d+[._]\d+[._]\d+)/);
        if (match) result.osVersion = match[1].replace(/_/g, '.');
    } else if (ua.includes('linux')) {
        result.os = 'Linux';
        if (ua.includes('android')) {
            result.os = 'Android';
            const match = ua.match(/android (\d+\.\d+\.\d+)/);
            if (match) result.osVersion = match[1];
        }
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
        result.os = 'iOS';
        const match = ua.match(/os (\d+[._]\d+[._]?\d*)/);
        if (match) result.osVersion = match[1].replace(/_/g, '.');
    }

    // ========== BROWSER DETECTION ==========
    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
        result.browser = 'Chrome';
        const match = ua.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
        if (match) result.browserVersion = match[1];
    } else if (ua.includes('firefox')) {
        result.browser = 'Firefox';
        const match = ua.match(/firefox\/(\d+\.\d+)/);
        if (match) result.browserVersion = match[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
        result.browser = 'Safari';
        const match = ua.match(/version\/(\d+\.\d+\.\d+)/);
        if (match) result.browserVersion = match[1];
    } else if (ua.includes('edg')) {
        result.browser = 'Edge';
        const match = ua.match(/edg\/(\d+\.\d+\.\d+\.\d+)/);
        if (match) result.browserVersion = match[1];
    } else if (ua.includes('opr') || ua.includes('opera')) {
        result.browser = 'Opera';
        const match = ua.match(/opr\/(\d+\.\d+\.\d+\.\d+)/);
        if (match) result.browserVersion = match[1];
    }

    // ========== DEVICE MODEL ==========
    if (ua.includes('iphone')) {
        result.deviceModel = 'iPhone';
        result.deviceVendor = 'Apple';
    } else if (ua.includes('ipad')) {
        result.deviceModel = 'iPad';
        result.deviceVendor = 'Apple';
    } else if (ua.includes('android')) {
        const match = ua.match(/android\s+\d+\.\d+\s*;\s*([^;)]+)/);
        if (match) {
            result.deviceModel = match[1].trim();
            result.deviceVendor = 'Android';
        }
    } else if (ua.includes('windows')) {
        result.deviceVendor = 'Microsoft';
        if (ua.includes('phone')) result.deviceModel = 'Windows Phone';
    }

    // ========== NETWORK TYPE ==========
    if (/mobile|android|iphone|cellular/i.test(ua)) {
        // Check for 4G/5G indicators
        if (ua.includes('4g') || ua.includes('lte')) {
            result.networkType = '4G';
        } else if (ua.includes('5g')) {
            result.networkType = '5G';
        } else if (ua.includes('3g')) {
            result.networkType = '3G';
        } else {
            result.networkType = 'cellular';
        }
    } else if (/wifi|wireless/i.test(ua)) {
        result.networkType = 'WiFi';
    } else {
        result.networkType = 'Ethernet';
    }

    return result;
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['cf-connecting-ip'] ||
           req.headers['x-real-ip'] ||
           req.ip ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'Unknown';
}

function getBrowserInfo(userAgent) {
    const info = detectDevice(userAgent);
    return {
        name: info.browser,
        version: info.browserVersion,
        os: info.os,
        osVersion: info.osVersion,
        deviceType: info.deviceType,
        deviceModel: info.deviceModel,
        deviceVendor: info.deviceVendor,
        networkType: info.networkType
    };
}

module.exports = {
    detectDevice,
    getClientIP,
    getIPLocation,
    getBrowserInfo
};