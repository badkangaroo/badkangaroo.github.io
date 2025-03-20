'use strict';

const UpdateGPSPosition = () => {
    navigator.geolocation.getCurrentPosition(location => {
        document.getElementById('latitude').value = location.coords.latitude;
        document.getElementById('longitude').value = location.coords.longitude;
        document.getElementById('GPSIcon').setAttribute('fill', 'var(--light-green)');
        // from latitude and lontitude get grid square
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
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
        document.getElementById('gridsquare').value = result.qth;
    }, err => {
        console.log(err);
        if (err.code === 1) {
            alert('Please enable location services.');
            document.getElementById('GPSIcon').setAttribute('fill', 'black');
        }
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}
