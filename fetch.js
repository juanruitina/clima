var fs = require('fs');
var jsonfile = require('jsonfile');
var ss = require('simple-statistics');
var fetch = require('node-fetch');

var file_climate = './data/aemet-climate.json';
var file_stations = './data/aemet-stations.json';

var current_year = new Date().getFullYear();
var start_year = current_year - 30;
var aemetApiKey = process.env.API_KEY_AEMET;

/* fill object with month numbers as keys and null as value */
function fill_months() {
    var month_array = {};

    for (var i = 1; i <= 13; i++) {
        var month = i.toString();
        month_array[month] = [];
    }

    return month_array;
}

function sentenceCase(str) {
    var words = str.split(' ');
    for (var i = 0; i < words.length; i++) {
        var word = words[i].toLowerCase();

        var lowercase_words = ["a", "de", "el", "la", "los", "las", "del", "esquí"];

        // word not in lowercase_words
        if (i == 0 || lowercase_words.indexOf(word) == -1) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }

        words[i] = word;
    }

    // make character next to hyphen uppercase
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        if ( word.indexOf('-') != -1 ) {
            var word_array = word.split('-');
            for (var j = 0; j < word_array.length; j++) {
                var word = word_array[j];
                word = word.charAt(0).toUpperCase() + word.slice(1);
                word_array[j] = word;
            }
            words[i] = word_array.join('-');
        }
    }

    // make character next to slash uppercase
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        if (word.indexOf('/') != -1) {
            var word_array = word.split('/');
            for (var j = 0; j < word_array.length; j++) {
                var word = word_array[j];
                word = word.charAt(0).toUpperCase() + word.slice(1);
                word_array[j] = word;
            }
            words[i] = word_array.join('/');
        }
    }

    words = words.join(' ');

    return words;
}

// from coordinates to decimal
function parseCoordinates(input) {
    var parts = input.match(/.{1,2}/g);

    var degrees = parseInt(parts[0]);
    var minutes = parseInt(parts[1]);
    var seconds = parseInt(parts[2]);
    var direction = parts[3];

    var dd = degrees + minutes / 60 + seconds / (60 * 60);

    // make negative for south and west
    if (direction == "S" || direction == "W") {
        dd = dd * -1;
    } // Don't do anything for north or east
    return dd.toFixed(4);
}

function processData() {
    /* CLEAN STATION LIST */
    console.log("Cleaning station data...");

    var data_stations = jsonfile.readFileSync(file_stations);
    var data_stations_clean = [];

    for (var i = 0; i < data_stations.length; i++) {
        var station = {
            aemet_id: data_stations[i].indicativo,
            name: sentenceCase(data_stations[i].nombre),
            region: sentenceCase(data_stations[i].provincia),
            lat: parseCoordinates(data_stations[i].latitud),
            lon: parseCoordinates(data_stations[i].longitud),
            // altitude: data_stations[i].altitud
        }
        
        data_stations_clean.push(station);
    }

    jsonfile.writeFileSync('./data/aemet-stations-clean.json', data_stations_clean);

    data_stations = data_stations_clean;

    /* CLEAN CLIMATE DATA */
    console.log("Cleaning climate data...");

    var data = jsonfile.readFileSync(file_climate);
    var clean_data = [];

    /* iterate over data */
    for (var i = 0; i < data.length; i++) {
        /* if element has tm_min, add to clean array */
        if (data[i].tm_min && data[i].tm_max) {
            item = {};
            item.date = data[i].fecha;
            item.aemet_id = data[i].indicativo;
            item.tm_min = data[i].tm_min;
            item.tm_max = data[i].tm_max;
            clean_data.push(item);
        }
    }

    /* store clean data in json file */
    jsonfile.writeFileSync('./data/aemet-climate-clean.json', clean_data, { spaces: 2 });

    /* ORDERED DATA */
    console.log("Joining station and climate data...");

    data = clean_data;
    var ordered_data = [];

    for (var i = 0; i < data.length; i++) {
        aemet_id = data[i].aemet_id;
        station_item = null;

        /* create unique aemet_id if it doesn't exist */
        var index = ordered_data.findIndex(function (item) {
            return item.aemet_id == aemet_id;
        });

        if ( index == -1 ) {
            item = {};
            item.aemet_id = aemet_id;
            
            /* get station data */
            for (var j = 0; j < data_stations.length; j++) {
                if (item.aemet_id == data_stations[j].aemet_id) {
                    item = Object.assign({}, data_stations[j]);

                    item.records = {};
                    item.averages = {};
                    item.projection_linear = {};

                    values = ['temp_max'];
                    for (var k = 0; k < values.length; k++) {
                        item.records[values[k]] = fill_months();
                        item.averages[values[k]] = fill_months();
                        item.projection_linear[values[k]] = fill_months();
                    }

                    break;
                }
            }
            ordered_data.push(item);
            station_item = ordered_data[ordered_data.length - 1];
        } else {
            station_item = ordered_data[index];
        }

        /* add data to station */
        var date = data[i].date.split('-');
        var year = date[0];
        var month = date[1];
        var month_string = month.toString();

        var record = [year, data[i].tm_max];
        
        if (station_item.records.temp_max[month_string] ) {
            station_item.records.temp_max[month_string].push(record);
        }
    }

    console.log("Doing calculations...");
    for (var i = 0; i < ordered_data.length; i++) {
        var station_item = ordered_data[i];
        for (var j = 1; j <= 13; j++) {
            var month = j;
            var month_string = month.toString();
            var records = station_item.records.temp_max[month_string];

            if (records.length >= 10) {
                // CALCULATE AVERAGE
                var values = [];
                for (var k = 0; k < records.length; k++) {
                    values.push( parseFloat( records[k][1] ) );
                }

                var average = ss.mean(values);
                station_item.averages.temp_max[month_string] = average.toFixed(1);

                // CALCULATE LINEAR REGRESSION
                // turn records into array of [x, y]
                var xy = [];
                for (var k = 0; k < records.length; k++) {
                    xy.push([parseInt(records[k][0]), parseFloat( records[k][1] )]);
                }

                var linearRegressionObject = ss.linearRegression(xy);
                var slope = linearRegressionObject.m;
                var intercept = linearRegressionObject.b;

                function project_linear(year) {
                    var value = slope * year + intercept;
                    return value.toFixed(1);
                }

                station_item.projection_linear.temp_max[month_string] = project_linear(current_year);
            } else if ( j < 13 ) {
                // drop station
                ordered_data.splice(i, 1);
                i--;
                break;
            }
        }
    }

    var dir = './data/stations';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    // save for each station
    console.log("Saving data for each station separately...");

    for (var i = 0; i < ordered_data.length; i++) {
        var station_item = ordered_data[i];
        var file_name = dir + '/' + station_item.aemet_id + '.json';
        jsonfile.writeFileSync(file_name, station_item, { spaces: 0 });
    }

    // remove from stations-clean if there's no file
    console.log("Removing stations with too little data...");

    for (var i = 0; i < data_stations_clean.length; i++) {
        var station_item = data_stations_clean[i];
        var file_name = dir + '/' + station_item.aemet_id + '.json';
        if ( !fs.existsSync(file_name) ) {
            data_stations_clean.splice(i, 1);
            i--;
        }
    }

    jsonfile.writeFileSync('./data/aemet-stations-clean.json', data_stations_clean, { spaces: 2 });
    console.log("Complete!");
}

var stations_request = 'https://opendata.aemet.es/opendata/api/valores/climatologicos/inventarioestaciones/todasestaciones/?api_key=' + aemetApiKey;

var climate_request = 'https://opendata.aemet.es/opendata/api/valores/climatologicos/mensualesanuales/datos/anioini/' + start_year + '-01-01T00%3A00%3A00UTC/aniofin/' + current_year + '-06-01T00%3A00%3A00UTC/estacion/0000/?api_key=' + aemetApiKey;

console.log("Requesting station data...");

fetch(stations_request)
    .then(res => res.json())
    .then(json => {
        if (json.estado != '200') {      
            console.error(json.descripcion);
            process.exit(1);
        }
        
        if (json.datos) {
            console.log("Downloading station data...");

            fetch(json.datos)
                .then(res => res.json())
                .then(function(data_json) {
                    // store data_json in file
                    var dir = './data';
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir);
                    }

                    fs.writeFileSync('./data/aemet-stations.json', JSON.stringify(data_json, null, 2), 'utf8');

                    console.log("Requesting climate data...");

                    fetch(climate_request)
                        .then(res => res.json())
                        .then(json => {
                            if (json.datos) {
                                console.log("Downloading climate data...");

                                fetch(json.datos)
                                    .then(res => res.json())
                                    .then(data_json => {
                                        // store data_json in file
                                        var dir = './data';
                                        if (!fs.existsSync(dir)) {
                                            fs.mkdirSync(dir);
                                        }

                                        fs.writeFileSync('./data/aemet-climate.json', JSON.stringify(data_json, null, 2), 'utf8');

                                        console.log("Processing data...");
                                        processData();
                                    });
                            }
                        });
                })
        }
    });