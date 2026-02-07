'use strict';
/******************************************************************************

██╗  ██╗ ██████╗  ██████╗ ███████╗██╗  ██╗
██║ ██╔╝██╔═████╗██╔═══██╗╚══███╔╝██║ ██╔╝
█████╔╝ ██║██╔██║██║   ██║  ███╔╝ █████╔╝ 
██╔═██╗ ████╔╝██║██║   ██║ ███╔╝  ██╔═██╗ 
██║  ██╗╚██████╔╝╚██████╔╝███████╗██║  ██╗
╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝
 ██████╗ ██████╗ ███████╗
██╔════╝ ██╔══██╗██╔════╝
██║  ███╗██████╔╝███████╗
██║   ██║██╔═══╝ ╚════██║
╚██████╔╝██║     ███████║
 ╚═════╝ ╚═╝     ╚══════╝
 ██████╗ ██████╗ ██╗██████╗   ███████╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ███████╗
██╔════╝ ██╔══██╗██║██╔══██╗  ██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝
██║  ███╗██████╔╝██║██║  ██║  ███████╗██║   ██║██║   ██║███████║██████╔╝█████╗
██║   ██║██╔══██╗██║██║  ██║  ╚════██║██║▄▄ ██║██║   ██║██╔══██║██╔══██╗██╔══╝
╚██████╔╝██║  ██║██║██████╔╝  ███████║╚██████╔╝╚██████╔╝██║  ██║██║  ██║███████╗
 ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝   ╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 ██████╗ █████╗ ██╗     ██████╗██╗  ██╗██╗     █████╗ ████████╗ ██████╗ ██████╗
██╔════╝██╔══██╗██║    ██╔════╝██║  ██║██║    ██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
██║     ███████║██║    ██║     ██║  ██║██║    ███████║   ██║   ██║   ██║██████╔╝
██║     ██╔══██║██║    ██║     ██║  ██║██║    ██╔══██║   ██║   ██║   ██║██╔══██╗
╚██████╗██║  ██║██████╗╚██████╗╚█████╔╝██████╗██║  ██║   ██║   ╚██████╔╝██║  ██║
 ╚═════╝╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚════╝ ╚═════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝

 This is a simple tool to calculate the grid square of a GPS location.
 The code here was originally from: Rich Clingman, K0OZK one of the original
 developers of the Ribbit PWA.
 https://k0ozk.com/
 https://ribbit-pwa-test.k0ozk.com/
 I took some liberties with the code to make it work in context of this project.
*******************************************************************************/

const UpdateGPSPosition = () => {
    const gpsButton = document.getElementById('updateGPS');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const gridsquareInput = document.getElementById('gridsquare');

    const formatCoord = (coord, maxAbs) => {
        if (typeof coord !== 'number' || Number.isNaN(coord)) return '';
        const clamped = Math.max(-maxAbs, Math.min(maxAbs, coord));
        const abs = Math.abs(clamped);
        // Always show sign, 4 decimals: ±DDD.dddd
        const sign = clamped >= 0 ? '+' : '-';
        return `${sign}${abs.toFixed(4)}`;
    };
    
    // Show loading state
    if (gpsButton) {
        gpsButton.disabled = true;
        gpsButton.textContent = 'Getting Location...';
    }
    
    navigator.geolocation.getCurrentPosition(location => {
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        
        // Update latitude and longitude inputs
        if (latitudeInput) latitudeInput.value = formatCoord(lat, 90);
        if (longitudeInput) longitudeInput.value = formatCoord(lon, 180);
        
        // Update GPS icon if it exists
        const gpsIcon = document.getElementById('GPSIcon');
        if (gpsIcon) {
            gpsIcon.setAttribute('fill', 'var(--primary-light)');
        }
        
        // Convert lat/lon to grid square
        const latLonToQth = (y, x, gsLevel = 6) => {
            let qth = ''
            let spread = ''
            let error = ''
            if (gsLevel < 2 || gsLevel > 18 || gsLevel % 2 !== 0) {
                error += 'gsLevel must be a positive even integer between 2 and 18. '
            }

            if (y < -90.0 || y > 90.0) {
                error += 'latitude must be a float between -90.0 and +90.0. '
            }

            if (x < -180.0 || x > 180.0) {
                error += 'longitude must be a float between -180.0 and +180.0. '
            }

            if (error !== '') {
                return { qth, spread, error }
            }
            // scale for gridding
            y = (y + 90) / 10
            x = (x + 180) / 20
            const charA = 65
            let loops = gsLevel / 2 + 1
            for (let i = 1; i < loops; ++i) {
                let latInt = Math.floor(y)
                let lonInt = Math.floor(x)

                if (i % 2) {
                    const latChar = String.fromCharCode(charA + latInt)
                    const lonChar = String.fromCharCode(charA + lonInt)
                    qth += `${lonChar}${latChar}`
                    spread += `${lonChar}${latChar} `

                    // set up for the next level 10x10 grid
                    y = ((y - latInt) * 10).toFixed(6)
                    x = ((x - lonInt) * 10).toFixed(6)
                } else {
                    qth += `${lonInt}${latInt}`
                    spread += `${lonInt}${latInt} `

                    // set up for the next level 24x24 grid
                    y = ((y - latInt) * 24).toFixed(6)
                    x = ((x - lonInt) * 24).toFixed(6)
                }
            }
            spread = spread.trim()
            return { qth, spread, error }
        }
        const result = latLonToQth(lat, lon);
        if (result.error) {
            console.error('Grid square calculation error:', result.error);
            if (gpsButton) {
                gpsButton.textContent = 'Error';
                setTimeout(() => {
                    gpsButton.disabled = false;
                    gpsButton.innerHTML = `
                        <svg class="icon" viewBox="0 0 4 6" fill="currentColor" style="width: 1em; height: 1em; margin-right: 0.25em;">
                            <path d="M0 2A1 1 0 014 2C4 3 3 4 2 6 1 4 0 3.1 0 2Z" />
                        </svg>
                        Get GPS
                    `;
                }, 2000);
            }
            return;
        }
        
        // Update gridsquare input and set flag so encode uses gps: true
        if (gridsquareInput) {
            gridsquareInput.value = result.qth.toUpperCase();
            // Trigger validation first, then set flag so manual-edit handler doesn't clear it
            if (gridsquareInput.dispatchEvent) {
                gridsquareInput.dispatchEvent(new Event('input'));
            }
            if (window.localStorage) {
                window.localStorage.setItem('gpsUsedForGridsquare', 'true');
            }
        }
        
        // Reset button
        if (gpsButton) {
            gpsButton.disabled = false;
            gpsButton.innerHTML = `
                <svg class="icon" viewBox="0 0 4 6" fill="currentColor" style="width: 1em; height: 1em; margin-right: 0.25em;">
                    <path d="M0 2A1 1 0 014 2C4 3 3 4 2 6 1 4 0 3.1 0 2Z" />
                </svg>
                Get GPS
            `;
        }
        
        console.log('GPS updated successfully:', result.qth);
    }, err => {
        console.error('GPS error:', err);
        if (gpsButton) {
            gpsButton.disabled = false;
            gpsButton.innerHTML = `
                <svg class="icon" viewBox="0 0 4 6" fill="currentColor" style="width: 1em; height: 1em; margin-right: 0.25em;">
                    <path d="M0 2A1 1 0 014 2C4 3 3 4 2 6 1 4 0 3.1 0 2Z" />
                </svg>
                Get GPS
            `;
        }
        
        let errorMsg = 'Failed to get GPS location.';
        if (err.code === 1) {
            errorMsg = 'Location access denied. Please enable location services in your browser settings.';
        } else if (err.code === 2) {
            errorMsg = 'Location unavailable. Please check your GPS settings.';
        } else if (err.code === 3) {
            errorMsg = 'Location request timed out. Please try again.';
        }
        
        // Show user-friendly error
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--error, #d32f2f); color: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); z-index: 10000; max-width: 300px;';
        errorDiv.textContent = errorMsg;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
        
        // Update GPS icon if it exists
        const gpsIcon = document.getElementById('GPSIcon');
        if (gpsIcon) {
            gpsIcon.setAttribute('fill', 'var(--error, #d32f2f)');
        }
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache for 1 minute
    });
}
