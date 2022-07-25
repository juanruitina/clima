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

function success(pos) {
    const user_coordinates = pos.coords;

    console.log('Your current position is:');
    console.log(`Latitude : ${user_coordinates.latitude}`);
    console.log(`Longitude: ${user_coordinates.longitude}`);
    console.log(`More or less ${user_coordinates.accuracy} meters.`);

    var station;

    for (var i = 0; i < station_data.length; i++) {
        var station_current = station_data[i];
        station_current.distance = distance(user_coordinates.latitude, user_coordinates.longitude, station_current.lat, station_current.lon, "K");

        if (!station || !station.distance || station_current.distance < station.distance) {
            station = station_current;
        }
    }

    // show closest station
    document.querySelector(".station").innerHTML += `La estación meteorológica más cercana es: ${station.nombre}`;

    // station.indicativo = 3195;

    if (station.indicativo) {
        var path = "./data/stations/" + station.indicativo + ".json"
        grabData(path).then(function (climate_data) {
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
            for (var i = 0; i < months.length; i++) {
                var table_header_cell = document.createElement("th");
                table_header_cell.innerHTML = months[i];
                table_header.appendChild(table_header_cell);
            }

            // PROJECTIONS
            var table_row = document.createElement("tr");
            table_row.classList.add("climate-table-row");
            table_body.appendChild(table_row);
            var table_row_cell = document.createElement("th");
            table_row_cell.innerHTML = "Temp. máx. media (°C)";
            table_row.appendChild(table_row_cell);

            // add one column per month
            for (var i = 0; i < months.length; i++) {
                var table_row_cell = document.createElement("td");
                table_row_cell.innerHTML = climate_data.projection_linear.temp_max[i + 1];
                // add data attribute with value
                table_row_cell.setAttribute("data-value", climate_data.projection_linear.temp_max[i + 1]);
                table_row.appendChild(table_row_cell);

                /*  var difference = climate_data.projection_linear.temp_max[i + 1] - climate_data.averages.temp_max[i + 1];
                difference = difference.toFixed(1);

                if ( difference > 0 ) {
                    difference = "+" + difference;
                }

                table_row_cell.innerHTML += `<span class="difference"><span class="sr-only">, Difference: </span>${difference}</span>`;  */
            }

            // inject table
            document.querySelector(".climate-table-container").appendChild(table);

            // change cell color based on data-value
            var cells = document.querySelectorAll(".climate-table td");
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                var value = cell.getAttribute("data-value");
                // add class in increments of 10, from -10 to 40
                var class_name = "";
                if (value < 0) {
                    class_name = "color-temp-freezing";
                } else if (value < 10) {
                    class_name = "color-temp-cold";
                } else if (value < 20) {
                    class_name = "color-temp-mild";
                } else if (value < 30) {
                    class_name = "color-temp-warm";
                } else {
                    class_name = "color-temp-hot";
                }
                cell.classList.add(class_name);
            }

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
                var color = color_temperature(value);
                cell.setAttribute("style", color);
            }
        });
    }
}

function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
}

grabData("./data/aemet-stations-clean.json").then(function (data) {
    station_data = data;
    navigator.geolocation.getCurrentPosition(success, error, options);
});