/**
 * Created by eamonnmaguire on 02/06/15.
 */

var ImpactGraph = {
    colors: d3.scale.ordinal()
        .domain(["citations", "references", "focus", "error"])
        .range(["#3B97D3", "#95A5A5", "#2C3E50", "#E64C3C"]),
    margins: {
        "left": 40,
        "right": 30,
        "top": 30,
        "bottom": 30
    }
};

ImpactGraph.functions = {

    process_data: function (publication_id, data) {
        var publications = [];

        var focus_publication = data[publication_id];
        publications.push({
            "id": publication_id,
            "type": "focus",
            "citation_count": focus_publication.citations.length,
            "year": parseInt(focus_publication.year)
        });

        console.log(focus_publication);

        var keys = ["citations", "references"];
        for (var key in keys) {

            for (var record_idx in focus_publication[keys[key]]) {
                var record_id = focus_publication[keys[key]][record_idx];

                var year = parseInt(data[record_id].year);

                if (!isNaN(year)) {
                    publications.push({
                        "id": record_id,
                        "type": keys[key] == "citations"
                            ? year >= focus_publication.year
                            ? keys[key] : "error"
                            : keys[key] == "references"
                            ? year <= focus_publication.year
                            ? keys[key] : "error" : keys[key],
                        "citation_count": data[record_id].citations.length,
                        "title": data[record_id].title,
                        "year": year
                    });
                }
            }
        }
        return publications;
    }

};

ImpactGraph.render = {};

ImpactGraph.load = function (publication_id, url, placement, width, height) {


    d3.json(url, function (data) {
        var publications = ImpactGraph.functions.process_data(publication_id, data);

        d3.select("#publication_info").html(data[publication_id].title);
        d3.select("#publication_id").html(publication_id)
        var svg = d3.select(placement).append("svg").attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + ImpactGraph.margins.left + "," + ImpactGraph.margins.top + ")");

        var x_scale = d3.scale.linear()
            .domain(d3.extent(publications, function (d) {
                return d.year;
            })).range([10, width - ImpactGraph.margins.left - ImpactGraph.margins.right]);

        var y_scale = d3.scale.linear()
            .domain(d3.extent(publications, function (d) {
                return d.citation_count == 0 ? 1 : d.citation_count;
            })).nice().range([height - ImpactGraph.margins.top - ImpactGraph.margins.bottom, 10]);

        svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + y_scale.range()[0] + ")");
        svg.append("g").attr("class", "y axis");

        var xAxis = d3.svg.axis().scale(x_scale).orient("bottom").tickPadding(2).tickFormat(d3.format("d"));
        var yAxis = d3.svg.axis().scale(y_scale).orient("left").tickPadding(2);

        svg.selectAll("g.y.axis").call(yAxis);
        svg.selectAll("g.x.axis").call(xAxis);

        svg.selectAll("g.line").data(publications).enter().append("line")
            .style("stroke", function(d) {
                return ImpactGraph.colors(d.type);
            })
            .style("stroke-width", 2)
            .attr("x1", function (d) {
                console.log("adding line from " + x_scale(d.year) + " to " + x_scale(data[publication_id].year))
                return x_scale(d.year);
            })
            .attr("y1", function (d) {
                return d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
            })
            .attr("x2", function (d) {
                return x_scale(data[publication_id].year);
            }).attr("y2", function (d) {
                var focus_node_citations = data[publication_id].citations.length;
                return focus_node_citations == 0 ? y_scale(1) : y_scale(focus_node_citations);
            })
            .style("opacity",1);

        svg.selectAll("g.square").data(publications).enter().append("circle").attr("r", 3).attr("cx", function (d) {
            console.log(x_scale(d.year));
            return x_scale(d.year);
        }).attr("cy", function (d) {
            return d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
        }).style("fill", function (d) {
            return ImpactGraph.colors(d.type);
        }).style("opacity", 1);



    })
}

