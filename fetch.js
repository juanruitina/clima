var fs = require('fs');
var ss = require('simple-statistics');
var fetch = require('node-fetch');
const { exit } = require('process');

var arg = process.argv[2];

var current_year = new Date().getFullYear();
var last_year = current_year - 1;

var year_span = 30;
if ( process.argv[3] ) {
    year_span = parseInt(process.argv[3]);
}

var start_year = last_year - year_span;
var aemetApiKey = process.env.API_KEY_AEMET;

/* fill object with month numbers as keys and null as value */
function fill_months() {
    var month_array = {};

    for (var i = 1; i <= 13; i++) {
        var month = i.toString();
        month_array[month] = {};
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

function processData(data_stations, data_climate) {
    /* CLEAN STATION LIST */
    console.log("Cleaning station data...");

    var data_stations_clean = [];

    for (var i = 0; i < data_stations.length; i++) {
        var station = {
            aemet_id: data_stations[i].indicativo,
            name: sentenceCase(data_stations[i].nombre).trim(),
            region: sentenceCase(data_stations[i].provincia).trim(),
            lat: parseCoordinates(data_stations[i].latitud),
            lon: parseCoordinates(data_stations[i].longitud),
            // altitude: data_stations[i].altitud
        }
        
        data_stations_clean.push(station);
    }

    if (arg == 'cache') {
        fs.writeFileSync('data/aemet-stations-all.json', JSON.stringify(data_stations_clean, null, 2));
    }

    data_stations = data_stations_clean;

    /* CLEAN CLIMATE DATA */
    console.log("Cleaning climate data...");

    var data = data_climate;
    var clean_data = [];

    /* iterate over data */
    for (var i = 0; i < data.length; i++) {
        /* if element has tm_min, add to clean array */
        if (data[i].tm_min && data[i].tm_max) {
            item = {};
            item.date = data[i].fecha;
            item.aemet_id = data[i].indicativo;

            item.records = {};
            item.records.temp_max = data[i].tm_max;
            item.records.temp_min = data[i].tm_min;
            
            clean_data.push(item);
        }
    }

    /* store clean data in json file */
    if (arg == 'cache' || arg == 'dry') {
        fs.writeFileSync('data/aemet-climate-all.json', JSON.stringify(clean_data, null, 2));
    }
    
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

                    const sets = ['records', 'averages', 'projection_linear', 'projection_linear10', 'projection_linear30'];

                    for (var k = 0; k < sets.length; k++) {
                        var set = sets[k];

                        item[set] = {
                            'temp_max': fill_months(),
                            'temp_min': fill_months()
                        }
                    }                    
                    ordered_data.push(item);

                    index = ordered_data.length - 1;
                    break;
                }
            }
        }

        /* add data to station */
        var date = data[i].date.split('-');
        var year = date[0];
        var month = date[1];

        var metrics = ['temp_max', 'temp_min'];

        for (var m = 0; m < metrics.length; m++) {
            var metric = metrics[m];
            ordered_data[index].records[metric][month][year] = data[i].records[metric];
        }
    }

    /* store clean data in json file */
    if (arg == 'cache' || arg == 'dry') {
        fs.writeFileSync('./data/aemet-climate-ordered.json', JSON.stringify(ordered_data, null, 2));
    }

    console.log("Doing calculations...");
    for (var i = 0; i < ordered_data.length; i++) {
        var station_item = ordered_data[i];

        metrics.forEach(metric => {
            var months = Object.keys(station_item.records[metric]);
            months.forEach(month => {
                var records = station_item.records[metric][month];
                var years = Object.keys(records);

                // Calculate only if data for at least 1/3 of the queried years (usually 10 years out of 30)
                if (years.length >= year_span / 3) {
                    // CALCULATE AVERAGE
                    var values = [];

                    for (year in records) {
                        values.push(parseFloat(records[year]));
                    }

                    var average = ss.mean(values);
                    station_item.averages[metric][month] = average;
                    station_item.averages[metric][month] = average.toFixed(1);

                    // CALCULATE LINEAR REGRESSION
                    // turn records into array of [x, y]
                    var xy = [];

                    for (year in records) {
                        xy.push([parseInt(year), parseFloat( records[year] )]);
                    }

                    var linearRegressionObject = ss.linearRegression(xy);
                    var slope = linearRegressionObject.m;
                    var intercept = linearRegressionObject.b;

                    function project_linear(year) {
                        var value = slope * year + intercept;
                        return value.toFixed(1);
                    }

                    station_item.projection_linear[metric][month] = project_linear(current_year);
                    station_item.projection_linear10[metric][month] = project_linear(current_year + 10);
                    station_item.projection_linear30[metric][month] = project_linear(current_year + 30);
                } else if (months.length < 13) {
                    // drop station
                    ordered_data.splice(i, 1);
                    i--;
                    // break;
                }
            });
        });
    }

    
    // save for each station
    
    var dir = './data/stations';
    console.log("Saving data for each station separately...");

    for (var i = 0; i < ordered_data.length; i++) {
        var station_item = ordered_data[i];
        var file_name = dir + '/' + station_item.aemet_id + '.json';
        fs.writeFileSync(file_name, JSON.stringify(station_item, null, 2));
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

    fs.writeFileSync('./data/aemet-stations.json', JSON.stringify(data_stations_clean, null, 0));
    console.log("Complete!");
}

var stations_dir = './data/stations';
if (!fs.existsSync(stations_dir)) {
    fs.mkdirSync(stations_dir, { recursive: true });
}

var stations_request = 'https://opendata.aemet.es/opendata/api/valores/climatologicos/inventarioestaciones/todasestaciones/?api_key=' + aemetApiKey;

var climate_request = 'https://opendata.aemet.es/opendata/api/valores/climatologicos/mensualesanuales/datos/anioini/' + start_year + '-01-01T00%3A00%3A00UTC/aniofin/' + last_year + '-01-01T00%3A00%3A00UTC/estacion/0000/?api_key=' + aemetApiKey;

console.log("Requesting station data...");

let myHeaders = new Headers();
myHeaders.append('Content-Type', 'text/plain; charset=UTF-8');
let decoder = new TextDecoder("iso-8859-15");

if ( arg == "dry" ) {
    var data_stations = JSON.parse(fs.readFileSync('./data/aemet-stations-raw.json'));
    var data_climate = JSON.parse(fs.readFileSync('./data/aemet-climate-raw.json'));
    processData(data_stations, data_climate);
} else {   
    fetch(stations_request, myHeaders)
        .then(function (response) {
            return response.arrayBuffer();
        })
        .then(function (buffer) {
            let text = decoder.decode(buffer);
            let json = JSON.parse(text);

            if (json.estado != '200') {      
                console.error(json.descripcion);
                process.exit(1);
            }
            
            if (json.datos) {
                console.log("Downloading station data...");

                if (arg == 'cache') {
                    fetch(json.metadatos, myHeaders)
                        .then(function (response) {
                            return response.arrayBuffer();
                        })
                        .then(function (buffer) {
                            let text = decoder.decode(buffer);
                            let json = JSON.parse(text);
                            fs.writeFileSync('./data/aemet-stations-metadata-raw.json', JSON.stringify(json, null, 2));
                        });
                }

                fetch(json.datos, myHeaders)
                    .then(function (response) {
                        return response.arrayBuffer();
                    })
                    .then(function (buffer) {
                        let text = decoder.decode(buffer);
                        let data_stations = JSON.parse(text);

                        // store data_json in file
                        var dir = './data';

                        if (arg == 'cache') {
                            fs.writeFileSync('./data/aemet-stations-raw.json', JSON.stringify(data_stations, null, 2), 'utf8');
                        }

                        console.log("Requesting climate data...");

                        fetch(climate_request)
                            .then(res => res.json())
                            .then(json => {
                                if (json.datos) {
                                    console.log("Downloading climate data...");

                                    if (arg == 'cache') {
                                        fetch(json.metadatos)
                                            .then(function (response) {
                                                return response.arrayBuffer();
                                            })
                                            .then(function (buffer) {
                                                let text = decoder.decode(buffer);
                                                let data_stations = JSON.parse(text);
                                                fs.writeFileSync('./data/aemet-climate-metadata-raw.json', JSON.stringify(data_stations, null, 2));
                                            });
                                    }
                                            
                                    fetch(json.datos)
                                        .then(function (response) {
                                            return response.arrayBuffer();
                                        })
                                        .then(function (buffer) {
                                            let text = decoder.decode(buffer);
                                            let data_climate = JSON.parse(text);

                                            if (arg == 'cache') {
                                                fs.writeFileSync('./data/aemet-climate-raw.json', JSON.stringify(data_climate, null, 2), 'utf8');
                                            }

                                            console.log("Processing data...");
                                            processData(data_stations, data_climate);
                                        });
                                }
                            });
                    })
            }
        });
}