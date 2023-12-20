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

function errorMessage(message = "", online = false) {
    if (online && !navigator.onLine) {
        message = "Parece que no hay acceso a internet. Por favor, verifica tu conexión.";
    }

    if (message != "") {
        document.querySelector(".error-message").innerHTML = message;
        document.querySelector(".loading-alert").classList.add("hidden");
        document.querySelector(".error-message").classList.remove("hidden");
    } else {
        document.querySelector(".error-message").classList.add("hidden");
    }  
}

function loadTable(aemet_id, is_close = false, distance = false, place_name = false) {
    errorMessage();

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

            <div class="station-more">
                <p class="station-meta"><strong>${climate_data.region}</strong> · ID: ${climate_data.aemet_id}</p>

                <ul class="station-options no-list">
                    <li>
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${ station_url }')">📋 Copiar enlace</button>
                    </li>
                    <li>
                        <a href="data/stations/${climate_data.aemet_id}.json" download="Estación ${climate_data.aemet_id} ${climate_data.name}.json">JSON</a>
                    </li>
                </ul>
            </div>
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
                document.querySelector('.station-label').innerHTML = `La estación meteorológica más cercana a <span class="location-name">${ place_name }</span> es`;
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

            if (value < -23.3 || value >= 32) {
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

    if (station.distance > 200) {
        errorMessage("No hay ninguna estación cercana a esta ubicación.");
    } else if (station.aemet_id) {
        loadTable(station.aemet_id, 'true', station.distance, place_name);
    }
}

function success(pos) {
    const user_coordinates = pos.coords;

    /* console.log('Your current position is:');
    console.log(`Latitude : ${user_coordinates.latitude}`);
    console.log(`Longitude: ${user_coordinates.longitude}`);
    console.log(`More or less ${user_coordinates.accuracy} meters.`); */

    loadCloserStation(user_coordinates.latitude, user_coordinates.longitude);
}

function error(err) {
    errorMessage("No se pudo obtener tu ubicación");
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
    option.innerHTML = "Provincia";
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
    option.innerHTML = "Estación";
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
        option.innerHTML = "Estación";
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
            errorMessage("Introduce un lugar");
        } else {
            errorMessage();

            // Show loading message
            document.querySelector(".loading-alert").classList.remove("hidden");

            let url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(searchField) + "&format=json&countrycodes=es&polygon=1&addressdetails=1&accept-language=es";

            // Send request to nominatim
            fetch(url)
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    // Check if there are results
                    if (data.length < 1) {
                        errorMessage("No se encontraron resultados. Prueba a cambiar tu búsqueda.");
                    } else {
                        var place;

                        // find first result whose type is 'boundary' (likely a ), else take first result
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].class === "boundary") {
                                place = data[i];
                                break;
                            }
                        }

                        if (!place) {
                            place = data[0];
                        }

                        document.querySelector(".loading-alert").classList.add("hidden");
                        
                        // Add results to results container

                        let place_type = place.type;
                        let place_name = place.address[place_type];

                        if (place_name === undefined) {
                            place_name = place.display_name.replace(", " + place.address.country, "");

                            var parameters = ["city_district", "suburb", "county", "postcode"];

                            for (const parameter of parameters) {
                                let value = place.address[parameter];

                                if (value) {
                                    place_name = place_name.replace(", " + value, "");
                                }
                            }
                        } else {
                            place_name = `${ place_name }`
                            
                            if (place.address.state) {
                                place_name += `, ${ place.address.state }`;
                            } 
                        }

                        place_name = `<a title="${ place.display_name }">${ place_name }</a>`;

                        loadCloserStation(place.lat, place.lon, place_name);
                    }
                }).catch(function (error) {
                    errorMessage("Hay algún problema con el buscador. Por favor, prueba de nuevo más tarde.", true);
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