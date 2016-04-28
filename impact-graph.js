/**
 * Created by eamonnmaguire on 02/06/15.
 */


var ImpactGraph = (function () {

    var options = {
        colors: d3.scale.ordinal()
            .domain(["citations", "references", "focus", "error"])
            .range(["#3B97D3", "#95A5A5", "#2C3E50", "#E64C3C"]),

        margins: {
            "left": 30,
            "right": 20,
            "top": 25,
            "bottom": 35
        },

        y_gutter: 50,
        show_axes: false,
        node_scaling: 0.01,
        width: 100, height: 100,
        'content-type': 'application/json'

    };

    var process_data = function (data) {
        var publications = [];
        var _citations_by_year = {};

        var focus_publication = data;

        publications.push({
            "id": focus_publication.inspire_id,
            "type": "focus",
            "title": focus_publication.title,
            "citation_count": focus_publication.citations.length,
            "year": parseInt(focus_publication.year)
        });

        var keys = ["citations", "references"];
        for (var key in keys) {

            for (var record_idx in focus_publication[keys[key]]) {
                var record = focus_publication[keys[key]][record_idx];

                var year = parseInt(record.year);

                if (!isNaN(year)) {

                    if (keys[key] == "citations") {
                        if (!(year in _citations_by_year)) {
                            _citations_by_year[year] = 0;
                        }
                        _citations_by_year[year] += 1;
                    }

                    publications.push({
                        "id": record.inspire_id,
                        "type": keys[key] == "citations"
                            ? year >= focus_publication.year
                            ? keys[key] : "error"
                            : keys[key] == "references"
                            ? year <= focus_publication.year
                            ? keys[key] : "error" : keys[key],
                        "citation_count": record.citation_count,
                        "title": record.title,
                        "year": year
                    });
                }
            }
        }

        var citations_by_year = [];
        for (var citation_idx in _citations_by_year) {
            citations_by_year.push({'year': citation_idx, 'value': _citations_by_year[citation_idx]})
        }


        return {'publications': publications, 'yearly_citations': citations_by_year};
    };

    var render_citations_by_year = function (svg, citations, xScale, options) {

        var cite_graph_tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
            return '<p><strong>' + d.year + '</strong></p><p>' + d.value + ' citations</p>';
        });

        svg.call(cite_graph_tip);

        var yScale = d3.scale.linear().domain([0, d3.max(citations, function (d) {
            return d.value;
        })]).range([0, options.margins.bottom - 20]);

        var yearly_citations = svg.append('g').attr('class', 'citation_summary').attr('transform', 'translate(-' + options.margins.left + ',-10)');
        var rect = yearly_citations.selectAll('.rect').data(citations).enter().append('rect');

        var bar_width = (options.width * options.node_scaling);
        rect.attr('x', function (d) {
            return xScale(d.year) - (bar_width/2);
        }).attr('y', function (d) {
            return (options.height - options.margins.bottom) - yScale(d.value);
        }).attr('width', bar_width)
            .attr('height', function (d) {
            return yScale(d.value);
        }).on('mouseover', cite_graph_tip.show)
            .on('mouseout', cite_graph_tip.hide)

    };

    return {
        load: function (url, placement, custom_options) {

            options = $.extend([], options, custom_options);

            var tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
                return '<p><strong>' + d.year + '</strong></p><p>' + d.title + '</p><p>' + d.citation_count + ' Citations</p>';
            });

            d3.json(url)
                .header('Accept', options['content-type'])
                .get(function (error, data) {
                    var processed_data = process_data(data);
                    var publications = processed_data['publications'];

                    var svg = d3.select(placement).append("svg").attr("width", options.width).attr("height", options.height).append("g").attr("transform", "translate(" + options.margins.left + "," + options.margins.top + ")");

                    svg.call(tip);

                    var x_scale = d3.scale.linear()
                        .domain(d3.extent(publications, function (d) {
                            return d.year;
                        })).range([options.margins.left, options.width - options.margins.left - options.margins.right]);

                    var y_scale = d3.scale.linear()
                        .domain([1, d3.max(publications, function (d) {
                            return +d.citation_count;
                        })])
                        .range([options.height - options.margins.bottom, options.margins.top]);

                    render_citations_by_year(svg, processed_data['yearly_citations'], x_scale, options);

                    if (options.show_axes) {
                        var xAxis = d3.svg.axis().scale(x_scale).orient("bottom").tickPadding(2).tickFormat(d3.format("d"));
                        var yAxis = d3.svg.axis().scale(y_scale).orient("left").tickPadding(2);


                        if (options.width < 300) {
                            xAxis.ticks(5);
                            yAxis.ticks(5);
                        }

                        yAxis.tickFormat(d3.format("s"));

                        svg.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(-" + options.margins.left + "," + (y_scale.range()[0]-10) + ")")
                            .call(xAxis);

                        svg.append("g")
                            .attr("class", "y axis")
                            .attr("transform", "translate(" + (options.margins.left - 30) + "," + (options.margins.top - options.y_gutter) + ")")
                            .call(yAxis);
                    }


                    var cite_graph_group = svg.append('g').attr('transform', 'translate(-' + options.margins.left + ',-' + options.margins.top + ')');

                    cite_graph_group.selectAll("g.line").data(publications).enter().append("line")
                        .style("stroke", function (d) {
                            return options.colors(d.type);
                        })
                        .style("stroke-width", 1)
                        .attr("x1", function (d) {
                            return x_scale(d.year);
                        })
                        .attr("y1", function (d) {

                            return d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
                        })
                        .attr("x2", function (d) {
                            return x_scale(data.year);
                        }).attr("y2", function (d) {
                            var focus_node_citations = data.citations.length;
                            return focus_node_citations == 0 ? y_scale(1) : y_scale(focus_node_citations);
                        })
                        .style("opacity", .6);

                    cite_graph_group.selectAll("g.node").data(publications).enter().append("circle").attr("r", function (d) {
                        return d.type == "focus" ? Math.min((options.height * options.node_scaling), 5) : Math.min((options.height * options.node_scaling), 5);
                    }).attr("class", function (d) {
                        return d.type;
                    }).attr("cx", function (d) {
                        return x_scale(d.year);
                    }).attr("cy", function (d) {
                        return d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
                    }).style("fill", function (d) {
                        return options.colors(d.type);
                    }).style("opacity", function (d) {
                        return d.type == "focus" ? 1 : .5;
                    }).on('mouseover', tip.show)
                        .on('mouseout', tip.hide)
                        .on('click', function (d) {

                            window.open('http://www.inspirehep.net/record/' + d.id, '_blank');
                        });
                });
        }
    }
})();

