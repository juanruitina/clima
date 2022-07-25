/* process json file */
var fs = require('fs');
var path = require('path');
var jsonfile = require('jsonfile');
var ss = require('simple-statistics');

var file_climate = './data/aemet-climate.json';
var file_stations = './data/aemet-stations.json';

/* fill object with month numbers as keys and null as value */
function fill_months() {
    var month_array = {};

    for (var i = 1; i <= 13; i++) {
        var month = i.toString();
        month_array[month] = [];
    }

    return month_array;
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

/* store file in variable */
var data_stations = jsonfile.readFileSync(file_stations);
/* iterate over data */
for (var i = 0; i < data_stations.length; i++) {
    data_stations[i].lat = parseCoordinates(data_stations[i].latitud);
    data_stations[i].lon = parseCoordinates(data_stations[i].longitud);
}
jsonfile.writeFileSync('./data/aemet-stations-clean.json', data_stations, { spaces: 2 });

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

console.log(clean_data);

/* ORDERED DATA */

/* iterate over data */
data = clean_data;
var ordered_data = [];

// data.length

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
            if (item.aemet_id == data_stations[j].indicativo) {
                item.name = data_stations[j].nombre;
                item.region = data_stations[j].provincia;
                item.lat = data_stations[j].lat;
                item.lon = data_stations[j].lon;

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

for (var i = 0; i < ordered_data.length; i++) {
    var station_item = ordered_data[i];
    for (var j = 1; j <= 13; j++) {
        var month = j;
        var month_string = month.toString();
        var records = station_item.records.temp_max[month_string];

        if (records.length > 0) {
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

            var current_year = new Date().getFullYear();

            station_item.projection_linear.temp_max[month_string] = project_linear(current_year);
        }
    }
}

/* store clean data in json file */
jsonfile.writeFileSync('./data/aemet-climate-ordered.json', ordered_data, { spaces: 2 });

// save for each station
for (var i = 0; i < ordered_data.length; i++) {
    var station_item = ordered_data[i];
    var file_name = './data/stations/' + station_item.aemet_id + '.json';
    jsonfile.writeFileSync(file_name, station_item, { spaces: 0 });
}
