/**
 * Created by eamonnmaguire on 02/06/15.
 */


var ImpactGraph = (function () {

    var options = {
        colors: d3.scale.ordinal()
            .domain(["citations", "references", "focus", "error", "paper_count"])
            .range(["#3B97D3", "#95A5A5", "#2C3E50", "#E64C3C", "#2C3E50"]),

        margins: {
            "left": 30,
            "right": 20,
            "top": 25,
            "bottom": 35
        },

        y_gutter: 50,
        show_axes: false,
        render_citations: true,
        node_scaling: 0.01,
        width: 100, height: 100,
        y_scale: 'linear',
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
            "citation_count": focus_publication.citation_count,
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

    var render_citations_by_year = function (svg, citations, xScale, options, variable) {

        var cite_graph_tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
            return '<p><strong>' + d.year + '</strong></p><p>' + d[variable] + ' citations</p>';
        });

        svg.call(cite_graph_tip);

        var yScale = d3.scale.linear().domain([0, d3.max(citations, function (d) {
            return d[variable];
        })]).range([0, options.margins.bottom - 20]);

        var yearly_citations = svg.append('g').attr('class', 'citation_summary').attr('transform', 'translate(-' + options.margins.left + ',-10)');
        var rect = yearly_citations.selectAll('.rect').data(citations).enter().append('rect');

        var bar_width = (options.width * options.node_scaling);
        rect.attr('x', function (d) {
            return xScale(d.year) - (bar_width / 2);
        }).attr('y', function (d) {
            return (options.height - options.margins.bottom) - yScale(d[variable]);
        }).attr('width', bar_width)
            .attr('height', function (d) {
                return yScale(d[variable]);
            })
            .style('fill', '#3B97D3')
            .on('mouseover', cite_graph_tip.show)
            .on('mouseout', cite_graph_tip.hide)

    };

    var render_bar_graph = function (svg, data, xVar, yVar, options, tip) {

        var x_extent = d3.extent(data, function (d) {
            return d[xVar];
        });

        var bar_count = x_extent[1] - x_extent[0];

        var bar_width = ((options.width - (bar_count * 5)) / bar_count);
        var xScale = d3.scale.linear()
            .domain(x_extent).range([bar_width, options.width - bar_width]);

        var yScale = d3.scale.linear().domain([0, d3.max(data, function (d) {
            return d[yVar];
        })]).range([0, options.height]);

        var plot = svg.append('g');
        var rect = plot.selectAll('.rect').data(data).enter().append('rect');

        rect.attr('x', function (d) {
            return xScale(d[xVar]) - (bar_width / 2);
        }).attr('y', function (d) {
            return options.height - yScale(d[yVar]);
        }).attr('width', bar_width)
            .attr('height', function (d) {
                return yScale(d[yVar]);
            })
            .style(options.style)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
    };

    var render_line_graph = function (svg, data, xVar, yVar, options) {
        var xScale = d3.scale.linear()
            .domain(d3.extent(data, function (d) {
                return d[xVar];
            })).range([0, options.width]);

        var yScale = d3.scale.linear().domain([0, d3.max(data, function (d) {
            return d[yVar];
        })]).range([0, options.height]);

        var plot = svg.append('g');

        var line = d3.svg.line()
            .x(function (d) {
                return xScale(d[xVar]);
            })
            .y(function (d) {
                return yScale.range()[1] - yScale(d[yVar]);
            });

        plot.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", line)
            .style(options.style);
    };

    var extend_options = function (options, custom_options) {
        return $.extend([], options, custom_options);
    };

    var render_impact_graph = function (svg, data, processed_data, x_scale, y_scale, tip, custom_options) {

        if (custom_options.render_citations && !custom_options.is_collection)
            render_citations_by_year(svg, processed_data['yearly_citations'], x_scale, custom_options, "value");

        if (custom_options.show_axes) {
            var xAxis = d3.svg.axis().scale(x_scale).orient("bottom").tickPadding(2).tickFormat(d3.format("d"));
            var yAxis = d3.svg.axis().scale(y_scale).orient("left").tickPadding(2);

            if (custom_options.width < 300) {
                xAxis.ticks(5);
                yAxis.ticks(5);
            }

            yAxis.tickFormat(d3.format("s"));

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(-" + custom_options.margins.left + "," + (y_scale.range()[0] - 10) + ")")
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + (custom_options.margins.left - 30) + "," + (custom_options.margins.top - custom_options.y_gutter) + ")")
                .call(yAxis);
        }

        if (custom_options.is_collection) {
            var scaled_edges = d3.scale.linear().domain(x_scale.domain()).range([0, 30]);
        }

        var cite_graph_group = svg.append('g').attr('transform', 'translate(-' + custom_options.margins.left + ',-' + custom_options.margins.top + ')');

        var line = cite_graph_group.selectAll("g.line").data(processed_data["publications"]).enter().append("line")
            .style("stroke", function (d) {
                return options.colors(d.type);
            })
            .style("stroke-width", 1.5)
            .attr("x1", function (d) {
                d.x1 = x_scale(d.year);
                return d.x1;
            })
            .attr("y1", function (d) {
                d.y1 = d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
                return d.y1;
            })
            .attr('class', function (d) {
                return "link-" + data.inspire_id;
            })
            .attr("x2", function (d) {
                d.x2 = x_scale(data.year);
                return d.x2;
            }).attr("y2", function (d) {
                var focus_node_citations = data.citation_count;
                d.y2 = focus_node_citations == 0 ? y_scale(1) : y_scale(focus_node_citations);
                return d.y2;
            })
            .style("opacity", .7);

        if (custom_options.is_collection) {
            line.attr("stroke-dasharray", function (d) {
                var a = d.x1 - d.x2;
                var b = d.y1 - d.y2;
                var c = Math.sqrt(a * a + b * b);
                d._dist = c;
                return c + ", " + c;
            }).attr("stroke-dashoffset", function (d) {
                return (d._dist * -1) + scaled_edges(d.year);
            })
        }


        cite_graph_group.selectAll("g.node").data(processed_data["publications"]).enter().append("circle").attr("r", function (d) {
            return d.type == "focus" ? Math.min((custom_options.height * custom_options.node_scaling), 5) : Math.min((custom_options.height * custom_options.node_scaling), 5);
        }).attr("class", function (d) {
            return 'node ' + d.type + " node-" + data.inspire_id;
        }).attr("cx", function (d) {
            return x_scale(d.year);
        }).attr("cy", function (d) {
            return d.citation_count == 0 ? y_scale(1) : y_scale(+d.citation_count);
        }).style("fill", function (d) {
            return custom_options.colors(d.type);
        }).style("opacity", function (d) {
            if (custom_options.is_collection && d.type != "focus") return 0;
            return 1;
        }).on('mouseover', function (d) {
            if (custom_options.is_collection) {
                svg.selectAll(".link-" + d.id).transition().attr("stroke-dashoffset", function (d) {
                    return 0;
                });

                svg.selectAll(".node-" + d.id).transition().style('opacity', 1);
            }
            tip.show(d);

        }).on('mouseout', function (d) {
            if (custom_options.is_collection) {
                svg.selectAll(".link-" + d.id).transition().attr("stroke-dashoffset", function (d) {
                    return (d._dist * -1) + scaled_edges(d.year);
                });

                svg.selectAll(".node-" + d.id).transition().style('opacity', function(d) {
                    return d.type !== "focus" ? 0 : 1;
                });
            }
            tip.hide(d);
        })
        .on('click', function (d) {
            window.open('http://www.inspirehep.net/record/' + d.id, '_blank');
        });
    };


    return {
        draw_citation_graph: function (url, placement, custom_options) {
            options = extend_options(options, custom_options);

            var tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
                return '<p><strong>' + d.year + '</strong></p><p>' + d.paper_count + ' Papers. '
                    + d.citation_count + ' total citations</p>';
            });

            d3.json(url)
                .header('Accept', options['content-type'])
                .get(function (error, data) {
                    var svg = d3.select(placement).append("svg")
                        .attr("width", options.width)
                        .attr("height", options.height).append("g");

                    svg.call(tip);

                    options['style'] = {"fill": options.colors("paper_count")};
                    render_bar_graph(svg, data['citations'], "year", "paper_count",
                        options, tip);

                    options['style'] = {"stroke": options.colors("citations"), 'stroke-width': 2, 'fill': 'none'};
                    render_line_graph(svg, data['citations'], "year", "citation_count",
                        options, tip);
                })
        },

        draw_impact_graph: function (url, placement, custom_options) {

            custom_options = extend_options(options, custom_options);

            var tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
                return '<p><strong>' + d.year + '</strong></p><p>' + d.title + '</p><p>' + d.citation_count + ' Citations</p>';
            });

            d3.json(url)
                .header('Accept', custom_options['content-type'])
                .get(function (error, data) {
                    var processed_data = process_data(data);
                    var publications = processed_data['publications'];

                    var svg = d3.select(placement).append("svg").attr("width", custom_options.width).attr("height", custom_options.height).append("g").attr("transform", "translate(" + options.margins.left + "," + options.margins.top + ")");

                    svg.call(tip);

                    var x_scale = d3.scale.linear()
                        .domain(d3.extent(publications, function (d) {
                            return d.year;
                        })).range([custom_options.margins.left,
                            custom_options.width - custom_options.margins.left - custom_options.margins.right]);

                    var y_scale = d3.scale.linear();
                    if (custom_options.y_scale === 'log') {
                        y_scale = d3.scale.log();
                    }

                    y_scale.domain([1, d3.max(publications, function (d) {
                        return +d.citation_count;
                    })])
                        .range([custom_options.height - custom_options.margins.bottom, custom_options.margins.top]);

                    render_impact_graph(svg, data, processed_data, x_scale, y_scale, tip, custom_options);
                });
        },

        draw_impact_summary: function (url, placement, custom_options) {
            custom_options = extend_options(options, custom_options);

            var tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
                return '<p><strong>' + d.year + '</strong></p><p>' + d.title + '</p><p>' + d.citation_count + ' Citations</p>';
            });

            d3.json(url)
                .header('Accept', options['content-type'])
                .get(function (error, data) {
                    var papers = data.papers;

                    var svg = d3.select(placement).append("svg").
                        attr('width', custom_options.width)
                        .attr('height', custom_options.height)
                        .append("g")
                        .attr("transform", "translate(" +
                        options.margins.left + "," +
                        options.margins.top + ")")


                    var date_extent = [Number.MAX_VALUE, Number.MIN_VALUE];
                    var citation_extent = [Number.MAX_VALUE, Number.MIN_VALUE];

                    for (var paper_idx in papers) {
                        var paper = papers[paper_idx];

                        var collection = paper.citations.concat(paper.references);

                        var citation_year_ext = d3.extent(collection, function (d) {
                            return d.year;
                        });

                        if (citation_year_ext[0] < date_extent[0]) date_extent[0] = citation_year_ext[0];
                        if (citation_year_ext[1] > date_extent[1]) date_extent[1] = citation_year_ext[1];

                        var citation_count_ext = d3.extent(collection, function (d) {
                            return d.citation_count;
                        });
                        if (citation_count_ext[0] < citation_extent[0]) citation_extent[0] = citation_count_ext[0];
                        if (citation_count_ext[1] > citation_extent[1]) citation_extent[1] = citation_count_ext[1];

                    }

                    for (var paper_idx in papers) {
                        var paper = papers[paper_idx];

                        var x_scale = d3.scale.linear()
                            .domain(date_extent).range([custom_options.margins.left, custom_options.width - custom_options.margins.left - custom_options.margins.right]);

                        var y_scale = d3.scale.linear();
                        if (custom_options.y_scale === 'log') {
                            y_scale = d3.scale.log();
                        }

                        y_scale.domain([1, citation_extent[1]])
                            .range([custom_options.height - custom_options.margins.bottom, custom_options.margins.top]);

                        var processed_data = process_data(paper);

                        custom_options.is_collection = true;
                        render_impact_graph(svg, paper, processed_data, x_scale, y_scale, tip, custom_options);
                    }

                })
        }
    }
})();

