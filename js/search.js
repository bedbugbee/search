const MIN_LAT = 22.2, MAX_LAT = 22.5, MIN_LONG = 113.9, MAX_LONG = 114.4;
const CENTER = [22.32, 114.17];

let data = new Map();
let start = Date.now();
$.ajax({
  url: "data/restaurant_list.json",
  success: function(result) {
    for (let [id, entry] of Object.entries(result)) {
      // Convert english text to lowercase for easier searching
      entry.ADR_EN = entry.ADR_EN.toLowerCase();
      entry.SS_EN = entry.SS_EN.toLowerCase();
      entry.latLong = [MIN_LAT + (MAX_LAT - MIN_LAT) * Math.random(),
        MIN_LONG + (MAX_LONG - MIN_LONG) * Math.random()];
      data.set(id, entry);
    }
    $("#status").html("JSON loaded in " + (Date.now()-start) + "ms");
    search();
  }
});

let resultMarkers = []; // for clearing previous markers
function search() {
  function wordScore(needle, haystack) {
    // If the entire search term (needle) is found, the score is based on:
    // - length of match as a percentage of haystack (longer is better)
    // - if not a full match, position of match (earlier is better)
    let idx = haystack.indexOf(needle);
    if (idx >= 0) {
      let percentage = (haystack.length - needle.length) / haystack.length;
      let pos = (haystack.length - idx) / haystack.length;
      return percentage + (1 - percentage) * pos / 3; // never exceeds 1
    }
    // TODO: fuzzy match?
    return 0;
  }

  function combinedScore(val, entry) {
    let nameScore = 2 * (wordScore(val, entry.SS_TC) + wordScore(val, entry.SS_EN));
    let addrScore = wordScore(val, entry.ADR_TC) + wordScore(val, entry.ADR_EN);
    return nameScore > addrScore ? nameScore : addrScore;
  }

  let output = $("#output");
  let val = $("#input").val().trim().toLowerCase();

  let results = [];
  let range = parseInt($('input[name="range"]:checked').val());
  for (let [id, entry] of data) {
    // Filter by location
    if (myMarker.getLatLng().distanceTo(entry.latLong) > range) {
      continue;
    }

    // First try matching the full term.
    // Name weighs more than address.
    let score = combinedScore(val, entry);
    if (score > 0) {
      results.push({
        score: score, // TODO: weight by distance, etc
        id: id,
        entry: entry,
      });
      continue;
    }

    // Otherwise match by individual words.
    let totalScore = 0;
    for (let v of val.split(/\s+/)) {
      totalScore += combinedScore(v, entry);
    }
    if (totalScore > 0) {
      results.push({
        score: totalScore, // TODO: weight by distance, etc
        id: id,
        entry: entry,
      });
      continue;
    }
  }
  results.sort((a, b) => b.score - a.score); // descending order

  if (results.length > 0) {
    output.empty().css("color", "#000");
    for (let oldMarker of resultMarkers) {
      oldMarker.remove();
    }

    let i = 1;
    for (let result of results.slice(0, 9)) {
      $(`<li class="list-group-item">
          <span class="badge badge-secondary">${i}</span>
          <b>${result.entry.SS_TC}</b>
          <p class="mb-1">${result.entry.ADR_TC}</p>
        </li>`).appendTo(output);
      resultMarkers.push(L.marker(result.entry.latLong).addTo(map));
      i++;
    }
  } else {
    // Dim the output to indicate no match.
    output.css("color", "#999");
  }
}

let map = L.map('mapid').setView(CENTER, 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYmVkYnVnYmVlIiwiYSI6ImNqeXV2eWd5bDBjb3ozbmwyMjFtbHB4dmkifQ.TXHX86TCZgyBukhOUbOrXA', {
    attribution: '<a href="https://www.mapbox.com/about/maps/">&copy; Mapbox</a> | <a href="http://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a> | <a href="https://www.mapbox.com/map-feedback/">Improve this map</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoiYmVkYnVnYmVlIiwiYSI6ImNqeXV2eWd5bDBjb3ozbmwyMjFtbHB4dmkifQ.TXHX86TCZgyBukhOUbOrXA'
}).addTo(map);

let myMarker = L.marker(CENTER, {
  icon: new L.Icon.Default({
    iconUrl: "red-marker.png",
    iconRetinaUrl: "red-marker-2x.png",
    shadowUrl: "marker-shadow.png",
    imagePath: "img/",
  }),
  zIndexOffset: 1000,
  draggable: true,
}).addTo(map);

$("#input").on("change keyup paste", search);
myMarker.on("dragend", search);
$("input[name=range]").change(search);
