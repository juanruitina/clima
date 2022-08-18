// array of months in Spanish
//var months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
// abbreviations
var months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic", "Media"];

// https://stackoverflow.com/questions/24791010/how-to-find-the-coordinate-that-is-closest-to-the-point-of-origin

let station_data, coordinates;

function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1 / 180
    var radlat2 = Math.PI * lat2 / 180
    var theta = lon1 - lon2
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    if (unit == "K") { dist = dist * 1.609344 }
    if (unit == "N") { dist = dist * 0.8684 }
    return dist
}

// load json in variable
function grabData(route) {
    return fetch(route)
        .then(response => response.json());
}

// Geolocation
// https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0
};

/* Sort selectors alphabetically */
function sortSelectors() {
    var selectors = document.querySelectorAll('select');

    selectors.forEach(function(cl) {
        var clTexts = new Array();

        for (i = 1; i < cl.length; i++) {
            clTexts[i - 1] =
                cl.options[i].text.toUpperCase() + ";" +
                cl.options[i].text + ";" +
                cl.options[i].value + ";" +
                cl.options[i].selected;
        }

        clTexts.sort((a, b) => a.localeCompare(b, 'es', { ignorePunctuation: true }));

        for (i = 1; i < cl.length; i++) {
            var parts = clTexts[i - 1].split(';');

            cl.options[i].text = parts[1];
            cl.options[i].value = parts[2];
            if (parts[3] == "true") {
                cl.options[i].selected = true;
            } else {
                cl.options[i].selected = false;
            }
        }
    });
}

function loadTable(aemet_id, is_close = false, distance = false, place_name = false) {
    document.querySelector(".loading-alert").classList.remove("hidden");

    var path = "./data/stations/" + aemet_id + ".json"
    grabData(path).then(function (climate_data) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('estacion', climate_data.aemet_id);
        history.replaceState(null, null, "?" + urlParams.toString());

        let station_url = location.protocol + '//' + location.host + "/?estacion=" + climate_data.aemet_id;
        let share_message = "Descubre el clima real en " + climate_data.name + ": " + station_url;

        document.querySelector(".station").innerHTML = `
            <div class="station-label">Estación meteorológica</div>
            <h2 class="station-name">${climate_data.name}</h2>
            <p class="station-meta"><strong>${climate_data.region}</strong> · ID: ${climate_data.aemet_id}</p>

            <ul class="station-options no-list">
                <li>
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${ station_url }')">📋 Copiar enlace</button>
                </li>
                <li>
                    <a class="share-button" href="https://twitter.com/intent/tweet?source=https%3A%2F%2Fclima-pro.vercel.app&amp;text=${ encodeURIComponent(share_message) }" target="_blank" rel="noopener noreferrer" title="Share on Twitter"><svg class="icon" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path></svg><span class="btn-link-label">Tuitear</span></a>
                </li>
                <li>
                    <a href="data/stations/${climate_data.aemet_id}.json" download="Clima.pro - Estación ${climate_data.aemet_id}, ${climate_data.name}.json">Descargar datos (JSON)</a>
                </li>
            </ul>
        `;

        // Show distance
        if ( distance ) {
            var distance_element = document.querySelector(".station-meta");
            distance_element.innerHTML += ` · Distancia: ${ Math.round(distance) } km`;

            if ( distance <= 10 ) {
                distance_element.innerHTML += ` <a title="Dado que la estación es cercana, es probable que los datos sean representativos de la ubicación que has introducido">✅</a>`;
            } else if (distance > 20) {
                distance_element.innerHTML += ` <a title="Esta estación está bastante lejos. Los datos pueden no ser representativos para la ubicación que has introducido, particularmente si hay una diferencia notable en altitud o en distancia al mar.">⚠️</a>`;
            }
        }

        if ( is_close ) {
            if ( place_name ) {
                let place_name_short = place_name.replace(/^(.{40}[^\s]*).*/, "$1");

                if ( place_name_short != place_name ) {
                    place_name_short = `<a title="${place_name}">${place_name_short}…</a>`;
                }

                document.querySelector('.station-label').innerHTML = `La estación meteorológica más cercana a <span class="location-name">${ place_name_short }</span> es`;
            } else {
                document.querySelector('.station-label').innerHTML = "La estación meteorológica más cercana es";
            }
        }

        // create table
        var table = document.createElement("table");
        table.classList.add("climate-table");
        var table_body = document.createElement("tbody");
        table.appendChild(table_body);

        // create table header
        var table_header = document.createElement("tr");
        table_header.classList.add("climate-table-header");
        table_body.appendChild(table_header);
        var table_header_cell = document.createElement("th");
        table_header_cell.innerHTML = "Mes";
        table_header.appendChild(table_header_cell);

        // add one column per month
        for (var i = 0; i < months.length - 1; i++) {
            var table_header_cell = document.createElement("th");
            table_header_cell.innerHTML = months[i];
            table_header.appendChild(table_header_cell);
        }

        // PROJECTIONS
        function addRow(metric, label, show_difference = true) {
            var table_row = document.createElement("tr");
            table_row.classList.add("climate-table-row", "climate-table-row-" + metric);
            table_body.appendChild(table_row);
            var table_row_cell = document.createElement("th");
            table_row_cell.innerHTML = label;
            table_row.appendChild(table_row_cell);

            // add one column per month
            for (var i = 0; i < months.length - 1; i++) {
                var table_row_cell = document.createElement("td");

                var value = climate_data.projection_linear[metric][i + 1];
                
                if (value && value != "") {
                    var difference = climate_data.projection_linear[metric][i + 1] - climate_data.averages[metric][i + 1];

                    table_row_cell.innerHTML = value;
                    table_row_cell.setAttribute("data-value", value);

                    if (show_difference) {
                        difference = difference.toFixed(1);

                        if (difference > 0) {
                            difference = "+" + difference;
                        }

                        table_row_cell.innerHTML += `<span class="difference"><span class="sr-only">, diferencia: </span>${difference}</span>`;
                    }
                } else {
                    table_row_cell.innerHTML = "?";
                }

                table_row.appendChild(table_row_cell);
            }
        }

        addRow("temp_max", "Temp. máx. media (°C)");
        addRow("temp_min", "Temp. mín. media (°C)");

        // remove table
        document.querySelector(".climate-table-container").innerHTML = "";

        // inject table
        document.querySelector(".climate-table-container").appendChild(table);

        // colors from https://en.wikipedia.org/wiki/Module:Weather_box/colors

        function hex(value) {
            //let hex = value.toString(16);

            var hex = roundDblDigitHex(value);

            if ((hex.length % 2) > 0) {
                hex = "0" + hex;
            }

            return hex;
        }

        function roundDblDigitHex(x) {
            x = Math.round(x);
            if (x < 0) x = 0;
            if (x > 255) x = 255;
            x = x.toString(16);
            if (x.length === 1) x = '0' + x;
            return x;
        }

        function format_line(background, text_color) {
            return "background: #" + background + "; color:#" + text_color + ";";
        }

        function range_pos(value, start, stop) {
            if (start < stop) {
                if (value < start) {
                    return 0;
                } else if (value > stop) {
                    return 1;
                } else {
                    return (value - start) / (stop - start);
                }
            } else {
                if (value < stop) {
                    return 1;
                } else if (value > start) {
                    return 0;
                } else {
                    return (start - value) / (start - stop);
                }
            }
        }

        function color_temperature(value) {
            var item, background, text_color;

            if (value < 4.5) {
                item = range_pos(value, -42.75, 4.5) * 255;
                background = hex(item);
            } else {
                item = range_pos(value, 60, 41.5) * 255;
                background = hex(item);
            }

            if (value <= 4.5) {
                item = range_pos(value, -42.75, 4.5) * 255;
                background = background + hex(item);
            } else {
                item = range_pos(value, 41.5, 4.5) * 255;
                background = background + hex(item);
            }

            if (value < -42.78) {
                item = range_pos(value, -90, -42.78) * 255;
                background = background + hex(item);
            } else {
                item = range_pos(value, 23, 4.5) * 255;
                background = background + hex(item);
            }

            if (value < -23.3 || value >= 37.8) {
                text_color = "FFFFFF";
            } else {
                text_color = "000000";
            }

            return format_line(background, text_color);
        }

        // change cell color based on data-value
        var cells = document.querySelectorAll(".climate-table td");

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var value = cell.getAttribute("data-value");
            
            if (value && value != "") {
                var color = color_temperature(value);
                cell.setAttribute("style", color);
            } 
        }
    });

    document.querySelector(".loading-alert").classList.add("hidden")
}

function loadCloserStation(latitude, longitude, place_name = false) {
    var station;

    for (var i = 0; i < station_data.length; i++) {
        var station_current = station_data[i];
        station_current.distance = distance(latitude, longitude, station_current.lat, station_current.lon, "K");

        if (!station || !station.distance || station_current.distance < station.distance) {
            station = station_current;
        }
    }

    if (station.aemet_id) {
        loadTable(station.aemet_id, 'true', station.distance, place_name);
    }
}

function success(pos) {
    const user_coordinates = pos.coords;

    console.log('Your current position is:');
    console.log(`Latitude : ${user_coordinates.latitude}`);
    console.log(`Longitude: ${user_coordinates.longitude}`);
    console.log(`More or less ${user_coordinates.accuracy} meters.`);

    loadCloserStation(user_coordinates.latitude, user_coordinates.longitude);
}

function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
}

grabData("./data/aemet-stations.json").then(function (data) {
    station_data = data;

    // get random aemet_id
    function randomStation() {
        var random_station = station_data[Math.floor(Math.random() * station_data.length)];
        loadTable(random_station.aemet_id);
    }

    const urlParams = new URLSearchParams(window.location.search);
    var station_parameter = urlParams.get('estacion')

    if (station_parameter) {
        loadTable(station_parameter);
    } else {
        randomStation();
    }

    // ADD SELECTORS
    var select;

    // create select field and populate with unique region
    select = document.createElement("select");
    select.classList.add("select-region");
    var option = document.createElement("option");
    option.innerHTML = "Selecciona una provincia";
    option.setAttribute("value", "");
    select.appendChild(option);
    for (var i = 0; i < station_data.length; i++) {
        var region = station_data[i].region;
        // check if region already exists
        var option_exists = false;
        for (var j = 0; j < select.options.length; j++) {
            if (select.options[j].value === region) {
                option_exists = true;
            }
        }

        if (!option_exists) {
            var option = document.createElement("option");
            option.innerHTML = region;
            option.setAttribute("value", region);
            select.appendChild(option);
        }
    }
    
    document.querySelector(".station-select-container div").appendChild(select);

    // create select field and populate with stations
    select = document.createElement("select");
    select.classList.add("station-select");
    var option = document.createElement("option");
    option.innerHTML = "Selecciona una estación";
    option.setAttribute("value", "");
    select.appendChild(option);
    for (var i = 0; i < station_data.length; i++) {
        var option = document.createElement("option");
        option.innerHTML = station_data[i].name;
        option.setAttribute("value", station_data[i].aemet_id);
        select.appendChild(option);
    }
    document.querySelector(".station-select-container div").appendChild(select);

    // filter stations based on region
    document.querySelector(".select-region").addEventListener("change", function () {
        var region = document.querySelector(".select-region").value;
        var station_select = document.querySelector(".station-select");
        station_select.innerHTML = "";
        var option = document.createElement("option");
        option.innerHTML = "Selecciona una estación";
        option.setAttribute("value", "");
        station_select.appendChild(option);
        for (var i = 0; i < station_data.length; i++) {
            if (station_data[i].region === region) {
                var option = document.createElement("option");
                option.innerHTML = station_data[i].name;
                option.setAttribute("value", station_data[i].aemet_id);
                station_select.appendChild(option);
            }
        }
    }
    );

    sortSelectors();

    // load table based on station
    document.querySelector(".station-select").addEventListener("change", function () {
        var station_id = document.querySelector(".station-select").value;

        loadTable(station_id);
    });

    // Search locations

    function loadSearchResults() {
        var searchField = document.getElementById("search-location").value;

        // Check if search field is empty
        if (searchField == "") {
            // Show error message
            // document.querySelector(".error-message").innerHTML = "Introduce un lugar";
        } else {
            document.querySelector(".location-error").style.display = "block";
            document.querySelector(".location-error").innerHTML = "";

            console.log(searchField);

            // Show loading message
            document.querySelector(".location-loading").style.display = "block";

            let url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(searchField) + "&format=json&countrycodes=es&polygon=1&addressdetails=1&accept-language=es";
            console.log(url);

            // Send request to nominatim
            fetch(url)
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    // Hide loading message
                    document.querySelector(".location-loading").style.display = "none";
                    // Show results container
                    document.querySelector(".location-results").style.display = "block";
                    // Add results to results container

                    let place_type = data[0].type;
                    let place_name = data[0].address[place_type];

                    // if place_name is undefined
                    if (place_name === undefined) {
                        // replace ", Spain" from place_name
                        place_name = data[0].display_name.replace(", España", "");
                        // document.querySelector(".location-results").innerHTML = `${place_name}`;
                    } else {
                        place_name = `${ place_name }, ${ data[0].address.state }`;
                        // document.querySelector(".location-results").innerHTML = `${place_name}, ${data[0].address.state}`;
                    }

                    // let place_name = data[0].display_name.replace(", España", "");
                    
                    // document.querySelector(".location-results").innerHTML = `${place_name}`;


                    loadCloserStation(data[0].lat, data[0].lon, place_name);
                }).catch(function (error) {
                    console.log(error);
                }).finally(function () {
                });
        }
    }

    // Add event listener to search button
    document.getElementById('search-location-form').addEventListener("submit", function (e) {
        e.preventDefault(); 
        loadSearchResults();
    }, false);

    document.getElementById("search-button").addEventListener("click", function () {
        loadSearchResults();
    });

    // Add geolocation if available
    if ("geolocation" in navigator) {
        // add button to get user location
        var button = document.createElement("button");
        button.classList.add("get-location");
        button.innerHTML = "Obtener ubicación";

        button.addEventListener("click", function () {
            navigator.geolocation.getCurrentPosition(success, error, options);
        });

        document.querySelector(".location-select-container").appendChild(button);
    }

    // Add button to get random station
    var button = document.createElement("button");
    button.classList.add("get-random");
    button.innerHTML = "🔀 Aleatorio";
    document.querySelector(".select-container").appendChild(button);
    
    button.addEventListener("click", function () {
        randomStation();
    });
});