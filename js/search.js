let data = new Map();

function lower(s) {
  if (typeof s != "string") return "";
  return s.toLowerCase();
}

let start = Date.now();
$.ajax({
  url: "/data/restaurant_list.json",
  success: function(result) {
    for (let [id, entry] of Object.entries(result)) {
      entry.ADR_TC = lower(entry.ADR_TC);
      entry.ADR_EN = lower(entry.ADR_EN);
      entry.SS_TC = lower(entry.SS_TC);
      entry.SS_EN = lower(entry.SS_EN);
      data.set(id, entry)
    }
    $("#status").html("JSON loaded in " + (Date.now()-start) + "ms");
  }
});

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

$("#input").on("change keyup paste", function(e) {
  let output = $("#output");
  let val = $(this).val().trim();
  if (val.length == 0) {
    output.css("color", "#999");
    return;
  }

  let results = [];
  for (let [id, entry] of data) {
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
    for (let result of results.slice(0, 10)) {
      $(`<li class="list-group-item">
          <h5 class="mb-1">${result.entry.SS_TC}</h5>
          <p class="mb-1">${result.entry.ADR_TC}</p>
        </li>`).appendTo(output);
    }
  } else {
    // Dim the output to indicate no match.
    output.css("color", "#999");
  }
});
